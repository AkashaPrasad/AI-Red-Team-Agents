"""
Organization model — tenant boundary for multi-user collaboration.

An Organization groups users, projects, and providers under a single
administrative unit. All data is scoped to an organization.
"""

import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organizations"

    # --- Columns ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- Relationships ---
    users: Mapped[list["User"]] = relationship(  # noqa: F821
        "User",
        back_populates="organization",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    model_providers: Mapped[list["ModelProvider"]] = relationship(  # noqa: F821
        "ModelProvider",
        back_populates="organization",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    projects: Mapped[list["Project"]] = relationship(  # noqa: F821
        "Project",
        back_populates="organization",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(  # noqa: F821
        "AuditLog",
        back_populates="organization",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Organization id={self.id} slug={self.slug!r}>"
