"""Reset admin passwords to 'admin123'."""
import asyncio

import asyncpg
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _asyncpg_dsn() -> str:
    """Convert SQLAlchemy-style async URL into an asyncpg-compatible DSN."""
    return settings.async_database_url.replace("postgresql+asyncpg://", "postgresql://", 1)


async def main():
    hashed = pwd_context.hash("admin123")
    print(f"Generated hash: {hashed[:20]}...")

    conn = await asyncpg.connect(_asyncpg_dsn())

    for email in ["admin@localhost.dev", "john@gmail.com"]:
        r = await conn.execute(
            "UPDATE users SET hashed_password = $1 WHERE email = $2",
            hashed,
            email,
        )
        print(f"Updated {email}: {r}")

    # Verify
    rows = await conn.fetch(
        "SELECT email, LEFT(hashed_password, 10) as prefix FROM users WHERE email IN ($1, $2)",
        "admin@localhost.dev",
        "john@gmail.com",
    )
    for row in rows:
        print(f"  {row['email']}: {row['prefix']}...")

    await conn.close()
    print("Done! Login with admin@localhost.dev / admin123")


asyncio.run(main())
