from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import Role, UserStatus
from app.models import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)

    async def get_active_recipient(self, user_id: int) -> User | None:
        return await self.db.scalar(
            select(User).where(
                User.id == user_id,
                User.role.in_([Role.hr, Role.admin]),
                User.status == UserStatus.active,
            )
        )

    async def list_active_recipients(self, exclude_user_id: int) -> list[User]:
        rows = await self.db.scalars(
            select(User)
            .where(
                User.role.in_([Role.hr, Role.admin]),
                User.status == UserStatus.active,
                User.id != exclude_user_id,
            )
            .order_by(User.name, User.id)
        )
        return list(rows)

    async def get_by_email(self, email: str) -> User | None:
        return await self.db.scalar(select(User).where(User.email == email))

    async def add(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def commit(self) -> None:
        await self.db.commit()

    async def rollback(self) -> None:
        await self.db.rollback()

    async def search(
        self,
        *,
        status: UserStatus | None = None,
        role: Role | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[User], int]:
        conds = []
        if status is not None:
            conds.append(User.status == status)
        if role is not None:
            conds.append(User.role == role)
        total = await self.db.scalar(select(func.count()).select_from(User).where(*conds))
        rows = await self.db.scalars(
            select(User)
            .where(*conds)
            .order_by(User.created_at.desc(), User.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows), total or 0

    async def stats(self) -> dict[str, int]:
        counts = {status.value: 0 for status in UserStatus}
        rows = await self.db.execute(
            select(User.status, func.count()).group_by(User.status)
        )
        for status, count in rows:
            counts[status.value] = count
        return counts