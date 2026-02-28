"""One-off script to create all tables from SQLAlchemy models."""

import asyncio
from app.storage.models import Base
from app.storage.database import async_engine


async def main():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All tables created successfully.")
    await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
