"""
Async database engine and session factory.

Provides:
  - ``async_engine``  — the single AsyncEngine for the application.
  - ``AsyncSessionLocal`` — a session factory bound to the engine.
  - ``get_async_session()`` — FastAPI dependency that yields a session
    per request and commits / rolls back automatically.
"""

import ssl as _ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
# Neon / Supabase poolers use PgBouncer which doesn't support prepared
# statements.  Detect cloud hosts and disable the asyncpg statement cache.
# They also require TLS with an explicit SSLContext for asyncpg.
# Direct-IP connections (e.g. GCP Cloud SQL) don't need this treatment.
import re as _re
_is_ip_address = bool(_re.match(r'^\d{1,3}(\.\d{1,3}){3}$', settings.postgres_host))
_is_cloud_pg = (
    settings.postgres_host != "localhost"
    and "127.0.0.1" not in settings.postgres_host
    and not _is_ip_address  # Direct IP = GCP Cloud SQL etc., no PgBouncer/SSL needed
)

_cloud_connect_args: dict = {}
if _is_cloud_pg:
    _ctx = _ssl.create_default_context()
    _ctx.check_hostname = False
    _ctx.verify_mode = _ssl.CERT_NONE
    _cloud_connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "command_timeout": 30,
        "ssl": _ctx,
    }

async_engine = create_async_engine(
    settings.async_database_url,
    echo=settings.app_debug,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    **({
        "connect_args": _cloud_connect_args,
    } if _is_cloud_pg else {}),
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Standalone factory for background threads (separate event loop)
# ---------------------------------------------------------------------------
def create_standalone_session_factory() -> tuple:
    """Create a brand-new engine + session factory.

    Use this when running in a thread with its own ``asyncio`` event loop
    (e.g. the experiment runner).  The global ``async_engine`` is bound to
    the *main* loop and will raise "Future attached to a different loop"
    if used from another one.

    Returns ``(engine, SessionFactory)``.
    """
    engine = create_async_engine(
        settings.async_database_url,
        echo=settings.app_debug,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_timeout=30,
        **({"connect_args": _cloud_connect_args} if _is_cloud_pg else {}),
    )
    factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    return engine, factory


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session; commit on success, rollback on error."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
