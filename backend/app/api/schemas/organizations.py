"""
Pydantic schemas for the Organizations API.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200, pattern=r"^[a-z0-9][a-z0-9\-]*[a-z0-9]$")


class OrganizationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    is_active: bool | None = None


class SwitchOrganizationRequest(BaseModel):
    organization_id: UUID


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    is_active: bool
    member_count: int = 0
    project_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationList(BaseModel):
    items: list[OrganizationResponse]
    total: int
