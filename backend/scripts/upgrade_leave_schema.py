import asyncio

from sqlalchemy import text

from app.db.session import engine


async def main() -> None:
    try:
        async with engine.begin() as connection:
            result = await connection.execute(
                text(
                    """
                    SELECT COLUMN_NAME
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'leave_requests'
                    """
                )
            )
            columns = {row[0] for row in result}
            if not columns:
                raise RuntimeError("leave_requests table does not exist; run scripts.init_db first")
            if "body" not in columns:
                raise RuntimeError("leave_requests.body is missing; cannot preserve existing notes")

            if "ai_body" not in columns:
                await connection.execute(
                    text("ALTER TABLE leave_requests ADD COLUMN ai_body TEXT NULL AFTER body")
                )
            if "submitted_body" not in columns:
                await connection.execute(
                    text(
                        "ALTER TABLE leave_requests "
                        "ADD COLUMN submitted_body TEXT NULL AFTER ai_body"
                    )
                )

            await connection.execute(
                text("UPDATE leave_requests SET submitted_body = body WHERE submitted_body IS NULL")
            )
            await connection.execute(
                text("ALTER TABLE leave_requests MODIFY COLUMN submitted_body TEXT NOT NULL")
            )
    finally:
        await engine.dispose()

    print("Leave note columns are up to date; existing notes were preserved.")


if __name__ == "__main__":
    asyncio.run(main())