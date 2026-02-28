"""
ModelProvider model — LLM provider credentials and configuration.

Stores encrypted API keys for OpenAI, Azure OpenAI, Groq, etc.
Each provider belongs to a single user (owner).
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ModelProvider(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "model_providers"

    # --- Foreign Keys ---
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Columns ---
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'openai', 'azure_openai', 'groq'
    encrypted_api_key: Mapped[str] = mapped_column(Text, nullable=False)
    endpoint_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )  # Required for Azure
    model: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # e.g. gpt-4o, llama-3.3-70b-versatile
    is_valid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # --- Relationships ---
    owner: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="providers",
    )
    experiments: Mapped[list["Experiment"]] = relationship(  # noqa: F821
        "Experiment",
        back_populates="provider",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<ModelProvider id={self.id} name={self.name!r} type={self.provider_type!r}>"
