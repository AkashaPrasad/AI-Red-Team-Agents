"""
Providers API routes — CRUD + validation for model provider configurations.

Providers are scoped per user — each user manages their own providers.
"""

from __future__ import annotations

import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas.providers import (
    ProviderCreate,
    ProviderList,
    ProviderResponse,
    ProviderUpdate,
    ProviderValidationResult,
)
from app.services.audit import write_audit_log
from app.services.encryption import decrypt_value, encrypt_value, mask_secret
from app.services.llm_gateway import LLMGateway
from app.storage.database import get_async_session
from app.storage.models import Experiment, ModelProvider, User

router = APIRouter(prefix="/providers", tags=["providers"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(provider: ModelProvider, user: User | None = None) -> ProviderResponse:
    """Convert ORM model to response schema."""
    try:
        plain_key = decrypt_value(provider.encrypted_api_key)
        preview = mask_secret(plain_key)
    except Exception:
        preview = "***"

    created_by = None
    owner = user or getattr(provider, "owner", None)
    if owner:
        from app.api.schemas.shared import UserBrief
        created_by = UserBrief(id=owner.id, email=owner.email, full_name=owner.full_name)

    return ProviderResponse(
        id=provider.id,
        name=provider.name,
        provider_type=provider.provider_type,
        endpoint_url=provider.endpoint_url,
        model=provider.model,
        api_key_preview=preview,
        is_valid=provider.is_valid,
        created_by=created_by,
        created_at=provider.created_at,
        updated_at=provider.updated_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=ProviderList)
async def list_providers(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ProviderList:
    """List all providers visible to the current user."""
    result = await session.execute(
        select(ModelProvider)
        .where(ModelProvider.owner_id == current_user.id)
        .order_by(ModelProvider.created_at.desc())
    )
    providers = result.scalars().all()
    return ProviderList(
        items=[_to_response(p, current_user) for p in providers],
        total=len(providers),
    )


@router.get("/{provider_id}", response_model=ProviderResponse)
async def get_provider(
    provider_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ProviderResponse:
    """Get a single provider by ID."""
    provider = await _get_provider_or_404(provider_id, current_user, session)
    return _to_response(provider, current_user)


@router.post("", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    body: ProviderCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ProviderResponse:
    """Create a new model provider."""
    if body.provider_type == "azure_openai" and not body.endpoint_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="endpoint_url is required for Azure OpenAI providers",
        )

    encrypted_api_key = encrypt_value(body.api_key)

    # Validate credentials
    gateway = LLMGateway(
        provider_type=body.provider_type,
        encrypted_api_key=encrypted_api_key,
        endpoint_url=body.endpoint_url,
        model=body.model,
    )
    is_valid, _err = await gateway.validate_credentials()

    provider = ModelProvider(
        owner_id=current_user.id,
        name=body.name,
        provider_type=body.provider_type,
        encrypted_api_key=encrypted_api_key,
        endpoint_url=body.endpoint_url,
        model=body.model,
        is_valid=is_valid,
    )
    session.add(provider)
    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="provider.created",
        entity_type="model_provider",
        entity_id=provider.id,
        ip_address=request.client.host if request.client else None,
    )

    return _to_response(provider, current_user)


@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: UUID,
    body: ProviderUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ProviderResponse:
    """Update a provider."""
    provider = await _get_provider_or_404(provider_id, current_user, session)

    if body.name is not None:
        provider.name = body.name
    if body.endpoint_url is not None:
        provider.endpoint_url = body.endpoint_url
    if body.model is not None:
        provider.model = body.model

    if body.api_key is not None:
        provider.encrypted_api_key = encrypt_value(body.api_key)
        # Re-validate on key change
        gateway = LLMGateway(
            provider_type=provider.provider_type,
            encrypted_api_key=provider.encrypted_api_key,
            endpoint_url=provider.endpoint_url,
            model=provider.model,
        )
        provider.is_valid, _ = await gateway.validate_credentials()

    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="provider.updated",
        entity_type="model_provider",
        entity_id=provider.id,
        ip_address=request.client.host if request.client else None,
    )

    return _to_response(provider, current_user)


@router.delete("/{provider_id}", responses={204: {"description": "Provider deleted"}})
async def delete_provider(
    provider_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Delete a provider. 409 if experiments reference it."""
    provider = await _get_provider_or_404(provider_id, current_user, session)

    # Check for linked experiments
    count_result = await session.execute(
        select(func.count()).where(Experiment.provider_id == provider.id)
    )
    if count_result.scalar_one() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete provider with linked experiments",
        )

    await session.delete(provider)
    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="provider.deleted",
        entity_type="model_provider",
        entity_id=provider_id,
        ip_address=request.client.host if request.client else None,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{provider_id}/validate", response_model=ProviderValidationResult)
async def validate_provider(
    provider_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ProviderValidationResult:
    """Validate a provider's credentials with a test call."""
    provider = await _get_provider_or_404(provider_id, current_user, session)

    gateway = LLMGateway(
        provider_type=provider.provider_type,
        encrypted_api_key=provider.encrypted_api_key,
        endpoint_url=provider.endpoint_url,
        model=provider.model,
    )
    start = time.monotonic()
    is_valid, error_msg = await gateway.validate_credentials()
    latency_ms = int((time.monotonic() - start) * 1000)
    provider.is_valid = is_valid
    await session.flush()

    return ProviderValidationResult(
        provider_id=provider.id,
        is_valid=is_valid,
        message="Provider credentials are valid" if is_valid else f"Validation failed: {error_msg}",
        latency_ms=latency_ms if is_valid else None,
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_provider_or_404(
    provider_id: UUID,
    user: User,
    session: AsyncSession,
) -> ModelProvider:
    result = await session.execute(
        select(ModelProvider).where(
            ModelProvider.id == provider_id,
            ModelProvider.owner_id == user.id,
        )
    )
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return provider
