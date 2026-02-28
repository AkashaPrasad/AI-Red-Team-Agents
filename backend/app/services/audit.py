"""
Audit logging service.

Provides a simple helper to insert AuditLog records for any mutation.
Called from route handlers after successful database writes.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.storage.models import AuditLog, User


async def write_audit_log(
    session: AsyncSession,
    *,
    user: User | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an immutable audit record."""
    log = AuditLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    session.add(log)
    # flushed on next session.commit()
