from __future__ import annotations

from app.core.exceptions import Forbidden, NotFound
from app.enums import Role, UserStatus
from app.models import User
from app.repositories.user_repo import UserRepository
from app.schemas.admin import UserUpdate
from app.schemas.leave import RecipientOption


class UserService:
    def __init__(self, users: UserRepository):
        self.users = users

    async def list(self, status: UserStatus | None, role: Role | None, limit: int, offset: int):
        return await self.users.search(status=status, role=role, limit=limit, offset=offset)

    async def list_active_recipients(self, exclude_user_id: int) -> list[RecipientOption]:
        users = await self.users.list_active_recipients(exclude_user_id)
        return [
            RecipientOption(
                id=user.id,
                name=user.name,
                role=user.role,
            )
            for user in users
        ]

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