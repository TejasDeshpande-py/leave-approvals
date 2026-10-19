from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import Role, UserStatus
from app.models import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)

    async def get_active_hr(self, user_id: int) -> User | None:
        return await self.db.scalar(
            select(User).where(
                User.id == user_id,
                User.role == Role.hr,
                User.status == UserStatus.active,
            )
        )

    async def list_active_hr(self) -> list[User]:
        rows = await self.db.scalars(
            select(User)
            .where(User.role == Role.hr, User.status == UserStatus.active)
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