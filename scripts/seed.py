"""
Seed script — creates the default organization and admin user.

Usage:
    cd backend
    python -m scripts.seed
  OR:
    python ../scripts/seed.py
"""

import asyncio
import sys
import os

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.config import settings
from app.storage.database import AsyncSessionLocal, async_engine
from app.storage.models import Base, Organization, User
from app.api.deps import hash_password


async def seed():
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        from sqlalchemy import select

        result = await session.execute(
            select(User).where(User.email == settings.admin_email)
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Admin user '{settings.admin_email}' already exists. Skipping.")
            return

        # Create default organization
        org = Organization(
            name="Default Organization",
            slug="default",
            is_active=True,
        )
        session.add(org)
        await session.flush()

        # Create admin user
        admin = User(
            organization_id=org.id,
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            full_name="Admin",
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()

        print(f"Created organization: {org.name} (id={org.id})")
        print(f"Created admin user: {admin.email} (id={admin.id})")
        print(f"Password: {settings.admin_password}")


if __name__ == "__main__":
    asyncio.run(seed())
