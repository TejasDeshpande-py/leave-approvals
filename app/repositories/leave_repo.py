from datetime import date

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.enums import LeaveStatus
from app.models import LeaveRequest


class LeaveRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _base(self):
        return select(LeaveRequest).options(
            joinedload(LeaveRequest.employee),
            joinedload(LeaveRequest.to_hr),
        )

    async def commit(self) -> None:
        await self.db.commit()

    async def get(self, leave_id: int) -> LeaveRequest | None:
        # populate_existing refreshes server-generated columns (created_at) after flush/update
        return await self.db.scalar(
            self._base().where(LeaveRequest.id == leave_id).execution_options(populate_existing=True)
        )

    async def add(self, leave: LeaveRequest) -> LeaveRequest:
        self.db.add(leave)
        await self.db.flush()
        return await self.get(leave.id)

    async def has_overlap(self, employee_id: int, start: date, end: date) -> bool:
        stmt = select(func.count()).select_from(LeaveRequest).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status.in_([LeaveStatus.pending, LeaveStatus.approved]),
            LeaveRequest.start_date <= end,
            LeaveRequest.end_date >= start,
        )
        return (await self.db.scalar(stmt)) > 0

    async def search(
        self,
        *,
        employee_id: int | None = None,
        to_hr_id: int | None = None,
        status: LeaveStatus | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[LeaveRequest], int]:
        conds = []
        if employee_id is not None:
            conds.append(LeaveRequest.employee_id == employee_id)
        if to_hr_id is not None:
            conds.append(LeaveRequest.to_hr_id == to_hr_id)
        if status is not None:
            conds.append(LeaveRequest.status == status)
        if from_date:  # overlap semantics
            conds.append(LeaveRequest.end_date >= from_date)
        if to_date:
            conds.append(LeaveRequest.start_date <= to_date)

        total = await self.db.scalar(select(func.count()).select_from(LeaveRequest).where(*conds))
        rows = await self.db.scalars(
            self._base()
            .where(*conds)
            .order_by(LeaveRequest.created_at.desc(), LeaveRequest.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows), total

    async def stats(self, to_hr_id: int) -> dict[str, int]:
        counts = {s.value: 0 for s in LeaveStatus}
        rows = await self.db.execute(
            select(LeaveRequest.status, func.count())
            .where(LeaveRequest.to_hr_id == to_hr_id)
            .group_by(LeaveRequest.status)
        )
        for status, n in rows:
            counts[status.value] = n
        return counts

    async def decide(
        self,
        leave_id: int,
        to_hr_id: int,
        status: LeaveStatus,
        reviewer_id: int,
        comment: str | None,
    ) -> bool:
        """Atomic: succeeds only if the request is still pending."""
        res = await self.db.execute(
            update(LeaveRequest)
            .where(
                LeaveRequest.id == leave_id,
                LeaveRequest.to_hr_id == to_hr_id,
                LeaveRequest.status == LeaveStatus.pending,
            )
            .values(
                status=status,
                reviewed_by=reviewer_id,
                reviewed_at=func.now(),
                review_comment=comment,
            )
        )
        return res.rowcount == 1