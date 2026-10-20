import jwt
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import Conflict, Forbidden, Unauthorized
from app.core.security import (
    AccessTokenClaims,
    DUMMY_HASH,
    TokenPair,
    create_access_token,
    create_token_pair,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.enums import ROLE_CLAIM_BY_ROLE, Role, UserStatus
from app.models import User
from app.repositories.user_repo import UserRepository


class AuthService:
    def __init__(self, users: UserRepository):
        self.users = users

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            raise Unauthorized("Current password is incorrect")
        user.password_hash = hash_password(new_password)
        await self.users.commit()

    async def register(self, name: str, email: str, password: str) -> User:
        email = email.strip().lower()
        if await self.users.get_by_email(email):
            raise Conflict("Email already registered")
        # Role and status are fixed here; never taken from the request
        user = User(
            name=name.strip(),
            email=email,
            password_hash=hash_password(password),
            role=Role.employee,
            status=UserStatus.pending,
        )
        try:
            await self.users.add(user)
            await self.users.commit()
        except IntegrityError:
            await self.users.rollback()
            raise Conflict("Email already registered")
        return user

    async def login(self, email: str, password: str) -> TokenPair:
        user = await self.users.get_by_email(email.strip().lower())
        password_ok = verify_password(password, user.password_hash if user else DUMMY_HASH)
        if not user or not password_ok:
            raise Unauthorized("Invalid email or password")
        # status is revealed only after the password has been verified
        if user.status == UserStatus.pending:
            raise Forbidden("Your account is awaiting admin approval")
        if user.status != UserStatus.active:
            raise Forbidden("Your account has been disabled")
        return create_token_pair(user.id, user.name, user.email, user.role)

    async def refresh(self, refresh_token: str) -> str:
        try:
            user_id = decode_refresh_token(refresh_token)
        except (jwt.PyJWTError, ValueError) as exc:
            raise Unauthorized("Invalid or expired refresh token") from exc
        user = await self.users.get_by_id(user_id)
        if not user or user.status != UserStatus.active:
            raise Unauthorized("Invalid or expired refresh token")
        return create_access_token(user.id, user.name, user.email, user.role)

    async def session(
        self,
        access_token: str | None,
        refresh_token: str | None,
    ) -> tuple[User, str]:
        if access_token:
            try:
                claims = decode_access_token(access_token)
            except (jwt.PyJWTError, ValueError):
                claims = None
            if claims:
                user = await self.users.get_by_id(claims.user_id)
                if user and self._claims_match_user(claims, user):
                    return user, access_token

        if not refresh_token:
            raise Unauthorized("Invalid or expired token")
        try:
            user_id = decode_refresh_token(refresh_token)
        except (jwt.PyJWTError, ValueError) as exc:
            raise Unauthorized("Invalid or expired refresh token") from exc
        user = await self.users.get_by_id(user_id)
        if not user or user.status != UserStatus.active:
            raise Unauthorized("Invalid or expired refresh token")
        return user, create_access_token(user.id, user.name, user.email, user.role)

    @staticmethod
    def _claims_match_user(claims: AccessTokenClaims, user: User) -> bool:
        return (
            user.status == UserStatus.active
            and user.name == claims.name
            and user.email == claims.email
            and ROLE_CLAIM_BY_ROLE[user.role] == claims.role
        )