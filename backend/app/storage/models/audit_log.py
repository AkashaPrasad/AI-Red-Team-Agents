"""
AuditLog model — immutable record of security-relevant actions.

Captures who did what, when, and from where.  Used for compliance
reporting and forensic analysis.  Records are append-only; the model
intentionally omits updated_at.
"""

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    # --- Foreign Keys ---
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # --- Event data ---
    action: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # e.g. "user.login", "experiment.created", "provider.deleted"
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g. "user", "project", "experiment"
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )  # ID of the affected entity
    details: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )  # arbitrary context: old_values, new_values, etc.

    # --- Request context ---
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    # --- Relationships ---
    organization: Mapped["Organization | None"] = relationship(  # noqa: F821
        "Organization",
        back_populates="audit_logs",
    )
    user: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        back_populates="audit_logs",
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} action={self.action!r} "
            f"entity={self.entity_type}:{self.entity_id}>"
        )
