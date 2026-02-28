"""
Auth router — email/password + Google login, refresh, me.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.transport.requests import Request as GoogleTransportRequest
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import settings
from app.services.audit import write_audit_log
from app.storage.database import get_async_session
from app.storage.models import User

router = APIRouter(prefix="/auth")

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=20)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    is_active: bool
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else "",
        updated_at=user.updated_at.isoformat() if user.updated_at else "",
    )


def _build_tokens(user: User) -> TokenResponse:
    data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


async def _create_user(
    session: AsyncSession,
    *,
    email: str,
    hashed_password: str,
    full_name: str | None,
    auth_provider: str = "local",
    google_sub: str | None = None,
) -> User:
    """Create a new user."""
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role="user",
        auth_provider=auth_provider,
        google_sub=google_sub,
    )
    session.add(user)
    await session.flush()
    return user


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Authenticate with email + password, return JWT pair."""
    email = body.email.strip().lower()
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    user.last_login_at = datetime.now(timezone.utc)
    await session.flush()

    await write_audit_log(
        session,
        user=user,
        action="user.login",
        entity_type="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
    )

    return _build_tokens(user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Create a new user account with email/password, return JWT pair."""
    email = body.email.strip().lower()
    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = await _create_user(
        session,
        email=email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name.strip(),
        auth_provider="local",
    )

    await write_audit_log(
        session,
        user=user,
        action="user.registered",
        entity_type="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
    )

    return _build_tokens(user)


@router.post("/google", response_model=TokenResponse)
async def google_login(
    body: GoogleLoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Authenticate with Google ID token, return JWT pair."""
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured",
        )

    try:
        token_payload = google_id_token.verify_oauth2_token(
            body.id_token,
            GoogleTransportRequest(),
            settings.google_oauth_client_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        ) from exc

    issuer = str(token_payload.get("iss", ""))
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token issuer",
        )

    email = str(token_payload.get("email", "")).strip().lower()
    is_email_verified = bool(token_payload.get("email_verified", False))
    if not email or not is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google account email is not verified",
        )

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = await _create_user(
            session,
            email=email,
            # Keep local-password auth disabled by storing random non-user password.
            hashed_password=hash_password(secrets.token_urlsafe(48)),
            full_name=str(token_payload.get("name", "")).strip() or None,
            auth_provider="google",
            google_sub=str(token_payload.get("sub", "")).strip() or None,
        )
    elif not user.full_name and token_payload.get("name"):
        user.full_name = str(token_payload.get("name")).strip()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    user.last_login_at = datetime.now(timezone.utc)
    await session.flush()

    await write_audit_log(
        session,
        user=user,
        action="user.login.google",
        entity_type="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
    )

    return _build_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """Exchange a valid refresh token for a new JWT pair."""
    from jose import JWTError, jwt as jose_jwt
    from uuid import UUID

    try:
        payload = jose_jwt.decode(
            body.refresh_token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await session.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return _build_tokens(user)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return the currently authenticated user profile."""
    return _user_to_response(current_user)
