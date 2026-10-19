from datetime import date

from app.core.exceptions import Conflict, Forbidden, NotFound
from app.enums import LeaveStatus, Role
from app.models import LeaveRequest, User
from app.repositories.leave_repo import LeaveRepository
from app.repositories.user_repo import UserRepository
from app.schemas.leave import Decision, LeaveCreate


class LeaveService:
    def __init__(self, leaves: LeaveRepository, users: UserRepository):
        self.leaves = leaves
        self.users = users

    async def submit(self, user: User, data: LeaveCreate) -> LeaveRequest:
        if data.recipient_id == user.id:
            raise Forbidden("You cannot send a leave request to yourself")
        if not await self.users.get_active_recipient(data.recipient_id):
            raise NotFound("Selected HR or admin recipient not found")
        if await self.leaves.has_overlap(user.id, data.start_date, data.end_date):
            raise Conflict("You already have a pending or approved request overlapping these dates")
        leave_data = data.model_dump(exclude={"recipient_id"})
        leave = await self.leaves.add(
            LeaveRequest(employee_id=user.id, to_hr_id=data.recipient_id, **leave_data)
        )
        await self.leaves.commit()
        return leave

    async def my_leaves(self, user: User, status: LeaveStatus | None, limit: int, offset: int):
        return await self.leaves.search(employee_id=user.id, status=status, limit=limit, offset=offset)

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