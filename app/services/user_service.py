from __future__ import annotations

from app.core.exceptions import Forbidden, NotFound
from app.enums import Role, UserStatus
from app.models import User
from app.repositories.user_repo import UserRepository
from app.schemas.admin import UserUpdate


class UserService:
    def __init__(self, users: UserRepository):
        self.users = users

    async def list(self, status: UserStatus | None, role: Role | None, limit: int, offset: int):
        return await self.users.search(status=status, role=role, limit=limit, offset=offset)

    async def list_active_hr(self) -> list[User]:
        return await self.users.list_active_hr()

    async def update(self, admin: User, user_id: int, data: UserUpdate) -> User:
        if user_id == admin.id:
            raise Forbidden("You cannot change your own role or status")
        user = await self.users.get_by_id(user_id)
        if not user:
            raise NotFound("User not found")
        if data.role is not None:
            user.role = data.role
        if data.status is not None:
            user.status = UserStatus(data.status)
        await self.users.commit()
        return user