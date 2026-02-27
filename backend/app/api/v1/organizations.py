"""
Organizations API routes — CRUD + user org switching.

Admin users can create/update/delete organizations.
Any authenticated user can list organizations and switch their own org.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.api.schemas.organizations import (
    OrganizationCreate,
    OrganizationList,
    OrganizationResponse,
    OrganizationUpdate,
    SwitchOrganizationRequest,
)
from app.services.audit import write_audit_log
from app.storage.database import get_async_session
from app.storage.models import Organization, Project, User

router = APIRouter(prefix="/organizations", tags=["organizations"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _org_to_response(org: Organization, session: AsyncSession) -> OrganizationResponse:
    """Build response with member and project counts."""
    member_count_res = await session.execute(
        select(func.count()).select_from(User).where(User.organization_id == org.id)
    )
    project_count_res = await session.execute(
        select(func.count()).select_from(Project).where(Project.organization_id == org.id)
    )
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        is_active=org.is_active,
        member_count=member_count_res.scalar_one(),
        project_count=project_count_res.scalar_one(),
        created_at=org.created_at,
        updated_at=org.updated_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=OrganizationList)
async def list_organizations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> OrganizationList:
    """List all organizations. Admins see all; members see only their own."""
    if current_user.role == "admin":
        query = select(Organization).order_by(Organization.created_at.desc())
    else:
        query = select(Organization).where(
            Organization.id == current_user.organization_id
        )

    result = await session.execute(query)
    orgs = result.scalars().all()

    items = []
    for org in orgs:
        items.append(await _org_to_response(org, session))

    return OrganizationList(items=items, total=len(items))


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> OrganizationResponse:
    """Get a single organization by ID."""
    org = await _get_org_or_404(org_id, session)

    # Non-admins can only view their own org
    if current_user.role != "admin" and org.id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await _org_to_response(org, session)


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> OrganizationResponse:
    """Create a new organization. Admin only."""
    # Check uniqueness of slug
    existing = await session.execute(
        select(Organization).where(Organization.slug == body.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization with slug '{body.slug}' already exists",
        )

    org = Organization(
        name=body.name,
        slug=body.slug,
    )
    session.add(org)
    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="organization.created",
        entity_type="organization",
        entity_id=org.id,
        ip_address=request.client.host if request.client else None,
    )

    return await _org_to_response(org, session)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    body: OrganizationUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> OrganizationResponse:
    """Update an organization. Admin only."""
    org = await _get_org_or_404(org_id, session)

    if body.name is not None:
        org.name = body.name
    if body.is_active is not None:
        org.is_active = body.is_active

    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="organization.updated",
        entity_type="organization",
        entity_id=org.id,
        ip_address=request.client.host if request.client else None,
    )

    return await _org_to_response(org, session)


@router.delete("/{org_id}", responses={204: {"description": "Organization deleted"}})
async def delete_organization(
    org_id: UUID,
    request: Request,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Delete an organization. Admin only. Cannot delete org you belong to."""
    org = await _get_org_or_404(org_id, session)

    if org.id == current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own organization",
        )

    await session.delete(org)
    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="organization.deleted",
        entity_type="organization",
        entity_id=org_id,
        ip_address=request.client.host if request.client else None,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/switch", response_model=OrganizationResponse)
async def switch_organization(
    body: SwitchOrganizationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> OrganizationResponse:
    """Switch the current user to a different organization. Admin only."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can switch organizations",
        )

    org = await _get_org_or_404(body.organization_id, session)
    if not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot switch to an inactive organization",
        )

    current_user.organization_id = org.id
    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="organization.switched",
        entity_type="organization",
        entity_id=org.id,
        ip_address=request.client.host if request.client else None,
    )

    return await _org_to_response(org, session)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_org_or_404(org_id: UUID, session: AsyncSession) -> Organization:
    result = await session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org
