from sqlalchemy.exc import IntegrityError

from app.core.exceptions import Conflict, Forbidden, Unauthorized
from app.core.security import DUMMY_HASH, create_access_token, hash_password, verify_password
from app.enums import Role, UserStatus
from app.models import User
from app.repositories.user_repo import UserRepository


class AuthService:
    def __init__(self, users: UserRepository):
        self.users = users

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

    async def login(self, email: str, password: str) -> str:
        user = await self.users.get_by_email(email.strip().lower())
        password_ok = verify_password(password, user.password_hash if user else DUMMY_HASH)
        if not user or not password_ok:
            raise Unauthorized("Invalid email or password")
        # status is revealed only after the password has been verified
        if user.status == UserStatus.pending:
            raise Forbidden("Your account is awaiting admin approval")
        if user.status != UserStatus.active:
            raise Forbidden("Your account has been disabled")
        return create_access_token(user.id, user.name, user.email, user.role)