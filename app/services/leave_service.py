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
        if not await self.users.get_active_hr(data.to_hr_id):
            raise NotFound("Selected HR recipient not found")
        if await self.leaves.has_overlap(user.id, data.start_date, data.end_date):
            raise Conflict("You already have a pending or approved request overlapping these dates")
        leave = await self.leaves.add(LeaveRequest(employee_id=user.id, **data.model_dump()))
        await self.leaves.commit()
        return leave

    async def my_leaves(self, user: User, status: LeaveStatus | None, limit: int, offset: int):
        return await self.leaves.search(employee_id=user.id, status=status, limit=limit, offset=offset)

    async def get(self, user: User, leave_id: int) -> LeaveRequest:
        leave = await self.leaves.get(leave_id)
        # 404 (not 403) for non-owners so existence isn't leaked
        if not leave or (
            (user.role == Role.hr and leave.to_hr_id != user.id)
            or (user.role != Role.hr and leave.employee_id != user.id)
        ):
            raise NotFound("Leave request not found")
        return leave

    async def list_all(
        self,
        to_hr_id: int,
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

    async def stats(self, to_hr_id: int) -> dict[str, int]:
        return await self.leaves.stats(to_hr_id)

    async def decide(self, hr: User, leave_id: int, data: Decision) -> LeaveRequest:
        leave = await self.leaves.get(leave_id)
        if not leave:
            raise NotFound("Leave request not found")
        if leave.to_hr_id != hr.id:
            raise NotFound("Leave request not found")
        if leave.employee_id == hr.id:
            raise Forbidden("You cannot review your own request")
        comment = data.comment.strip() if data.comment else None
        if not await self.leaves.decide(
            leave_id, hr.id, LeaveStatus(data.status), hr.id, comment
        ):
            raise Conflict("Request has already been decided")
        await self.leaves.commit()
        return await self.leaves.get(leave_id)