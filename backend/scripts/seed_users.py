import argparse
import asyncio
import getpass

from sqlalchemy import select

from app.core.config import settings
from app.auth.security import hash_password
from app.db.session import SessionLocal, engine
from app.enums import Role, UserStatus
from app.models import User


async def main(email: str, name: str, role: str, password: str) -> None:
    email = email.strip().lower()
    try:
        async with SessionLocal() as db:
            if await db.scalar(select(User.id).where(User.email == email)):
                print(f"{email} already exists")
                return
            db.add(
                User(
                    email=email,
                    name=name,
                    role=Role(role),
                    status=UserStatus.active,
                    password_hash=hash_password(password),
                )
            )
            await db.commit()
            print(f"created {role}: {email}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--role", choices=[r.value for r in Role], required=True)
    args = p.parse_args()

    pwd = settings.seed_password or getpass.getpass(f"Password for {args.email}: ")
    if len(pwd) < 8:
        raise SystemExit("Password must be at least 8 characters")
    asyncio.run(main(args.email, args.name, args.role, pwd))