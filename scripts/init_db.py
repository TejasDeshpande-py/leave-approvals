import argparse
import asyncio

from sqlalchemy import text

import app.models  # noqa: F401  (registers the tables)
from app.db.base import Base
from app.db.session import engine


async def main(reset: bool) -> None:
    async with engine.begin() as conn:
        if reset:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("tables dropped and recreated" if reset else "tables created")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="drop all tables first (destroys data)")
    asyncio.run(main(parser.parse_args().reset))
