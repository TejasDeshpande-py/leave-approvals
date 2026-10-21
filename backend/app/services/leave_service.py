from datetime import date

from app.core.exceptions import Conflict, Forbidden, NotFound
from app.auth.security import decode_recipient_key
from app.enums import LeaveStatus, Role
from app.models import LeaveRequest, User
from app.repositories.leave_repo import LeaveRepository
from app.repositories.user_repo import UserRepository
from app.schemas.leave import Decision, LeaveCreate, LeaveNoteUpdate


class LeaveService:
    def __init__(self, leaves: LeaveRepository, users: UserRepository):
        self.leaves = leaves
        self.users = users

    async def submit(self, user: User, data: LeaveCreate) -> LeaveRequest:
        try:
            recipient_id = decode_recipient_key(data.recipient_key) if data.recipient_key else data.recipient_id
        except ValueError as exc:
            raise NotFound("Selected recipient not found") from exc
        if recipient_id is None:
            raise NotFound("Selected recipient not found")
        if recipient_id == user.id:
            raise Forbidden("You cannot send a leave request to yourself")
        if not await self.users.get_active_recipient(recipient_id):
            raise NotFound("Selected HR or admin recipient not found")
        if await self.leaves.has_overlap(user.id, data.start_date, data.end_date):
            raise Conflict("You already have a pending or approved request overlapping these dates")
        leave_data = data.model_dump(exclude={"recipient_id", "recipient_key"})
        leave = await self.leaves.add(
            LeaveRequest(employee_id=user.id, to_hr_id=recipient_id, **leave_data)
        )
        await self.leaves.commit()
        return leave

    async def my_leaves(self, user: User, status: LeaveStatus | None, limit: int, offset: int):
        return await self.leaves.search(employee_id=user.id, status=status, limit=limit, offset=offset)

    async def update_note(self, user: User, leave_id: int, data: LeaveNoteUpdate) -> LeaveRequest:
        leave = await self.leaves.get(leave_id)
        if not leave:
            raise NotFound("Leave request not found")
        if leave.employee_id != user.id:
            raise Forbidden("You can only edit your own leave requests")
        if leave.status != LeaveStatus.pending:
            raise Conflict("Only pending leave requests can be edited")

        values = data.model_dump(exclude_unset=True)
        if not values:
            raise Conflict("Provide at least one note field to update")
        if "submitted_body" not in values:
            if "body" in values:
                values["submitted_body"] = values["body"]
            elif values.get("ai_body"):
                values["submitted_body"] = values["ai_body"]

        if not await self.leaves.update_note_if_pending(leave_id, user.id, values):
            raise Conflict("This leave request is no longer pending")
        await self.leaves.commit()
        updated = await self.leaves.get(leave_id)
        if not updated:
            raise NotFound("Leave request not found")
        return updated

    async def get(self, user: User, leave_id: int) -> LeaveRequest:
        leave = await self.leaves.get(leave_id)
        # 404 (not 403) for non-owners so existence isn't leaked
        if not leave or (
            user.role == Role.hr and leave.to_hr_id != user.id
        ) or (
            user.role not in (Role.hr, Role.admin) and leave.employee_id != user.id
        ):
            raise NotFound("Leave request not found")
        return leave

    async def list_all(
        self,
        to_hr_id: int | None,
        status: LeaveStatus | None,
        employee_id: int | None,
        from_date: date | None,
        to_date: date | None,
        limit: int,
        offset: int,
    ):
        return await self.leaves.search(
            to_hr_id=to_hr_id, status=status, employee_id=employee_id, from_date=from_date,
            to_date=to_date, limit=limit, offset=offset,
        )

    async def stats(self, recipient_id: int | None) -> dict[str, int]:
        return await self.leaves.stats(recipient_id)

    async def decide(self, reviewer: User, leave_id: int, data: Decision) -> LeaveRequest:
        leave = await self.leaves.get(leave_id)
        if not leave:
            raise NotFound("Leave request not found")
        if reviewer.role == Role.hr and leave.to_hr_id != reviewer.id:
            raise NotFound("Leave request not found")
        if leave.employee_id == reviewer.id:
            raise Forbidden("You cannot review your own request")
        comment = data.comment.strip() if data.comment else None
        if not await self.leaves.decide(
            leave_id,
            reviewer.id if reviewer.role == Role.hr else None,
            LeaveStatus(data.status),
            reviewer.id,
            comment,
        ):
            raise Conflict("Request has already been decided")
        await self.leaves.commit()
        return await self.leaves.get(leave_id)