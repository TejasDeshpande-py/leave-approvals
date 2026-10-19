from base64 import urlsafe_b64encode
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import NamedTuple

import jwt
from cryptography.fernet import Fernet, InvalidToken
from pwdlib import PasswordHash

from app.core.config import settings
from app.enums import ROLE_CLAIM_BY_ROLE, ROLE_BY_CLAIM, Role

_hasher = PasswordHash.recommended()  # argon2
DUMMY_HASH = _hasher.hash("dummy-password")  # equalizes timing for unknown emails
RECIPIENT_KEY_TTL_SECONDS = 24 * 60 * 60


def _recipient_key_cipher() -> Fernet:
    key = urlsafe_b64encode(sha256(f"{settings.jwt_secret}:leave-recipient".encode()).digest())
    return Fernet(key)


def create_recipient_key(user_id: int) -> str:
    return _recipient_key_cipher().encrypt(str(user_id).encode()).decode()


def decode_recipient_key(key: str) -> int:
    try:
        value = _recipient_key_cipher().decrypt(key.encode(), ttl=RECIPIENT_KEY_TTL_SECONDS)
        return int(value)
    except (InvalidToken, UnicodeDecodeError, ValueError) as exc:
        raise ValueError("Invalid or expired recipient key") from exc


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _hasher.verify(password, hashed)


class AccessTokenClaims(NamedTuple):
    user_id: int
    name: str
    email: str
    role: int


def create_access_token(user_id: int, name: str, email: str, role: Role) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "name": name,
        "email": email,
        "role": ROLE_CLAIM_BY_ROLE[role],
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> AccessTokenClaims:
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "sub", "name", "email", "role"]},
    )
    try:
        user_id = int(payload["sub"])
        name = payload["name"]
        email = payload["email"]
        role = payload["role"]
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid token claims") from exc
    if (
        not isinstance(name, str)
        or not isinstance(email, str)
        or type(role) is not int
        or role not in ROLE_BY_CLAIM
    ):
        raise ValueError("Invalid token claims")
    return AccessTokenClaims(user_id, name, email, role)