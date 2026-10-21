import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import Forbidden, Unauthorized
from app.auth.security import decode_access_token
from app.db.session import get_db
from app.enums import ROLE_CLAIM_BY_ROLE, Role, UserStatus
from app.models import User
from app.repositories.leave_repo import LeaveRepository
from app.repositories.user_repo import UserRepository
from app.auth.service import AuthService
from app.services.leave_service import LeaveService
from app.services.rephrase_service import RephraseService
from app.services.user_service import UserService

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None:
        raise Unauthorized("Not authenticated")
    try:
        claims = decode_access_token(creds.credentials)
    except (jwt.PyJWTError, ValueError):
        raise Unauthorized("Invalid or expired token")
    # Role and status come from the DB, not the token
    user = await UserRepository(db).get_by_id(claims.user_id)
    if (
        not user
        or user.status != UserStatus.active
        or user.name != claims.name
        or user.email != claims.email
        or ROLE_CLAIM_BY_ROLE[user.role] != claims.role
    ):
        raise Unauthorized("Invalid or expired token")
    return user


def require_role(*roles: Role):
    async def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise Forbidden()
        return user

    return dep


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


def get_leave_service(db: AsyncSession = Depends(get_db)) -> LeaveService:
    return LeaveService(LeaveRepository(db), UserRepository(db))


def get_rephrase_service() -> RephraseService:
    return RephraseService()


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))