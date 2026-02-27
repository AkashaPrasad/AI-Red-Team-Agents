"""
Pydantic schemas for the Providers API (Phase 6.1).
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.schemas.shared import UserBrief


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    provider_type: str = Field(..., pattern=r"^(openai|azure_openai|groq)$")
    api_key: str = Field(..., min_length=1, max_length=500)
    endpoint_url: str | None = Field(None, max_length=500)
    model: str | None = Field(None, max_length=100)


class ProviderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    api_key: str | None = Field(None, min_length=1, max_length=500)
    endpoint_url: str | None = Field(None, max_length=500)
    model: str | None = Field(None, max_length=100)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ProviderResponse(BaseModel):
    id: UUID
    name: str
    provider_type: str
    endpoint_url: str | None = None
    model: str | None = None
    api_key_preview: str | None = None
    is_valid: bool
    created_by: UserBrief | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProviderList(BaseModel):
    items: list[ProviderResponse]
    total: int


class ProviderValidationResult(BaseModel):
    provider_id: UUID
    is_valid: bool
    message: str
    latency_ms: int | None = None
