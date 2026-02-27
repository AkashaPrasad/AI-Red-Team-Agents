"""
FastAPI application factory — assembles all API routers, middleware,
exception handlers, and startup/shutdown events.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup and shutdown."""
    logger.info(
        "Starting %s v%s [env=%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    # Pre-load template registry on startup
    try:
        from app.engine.registry import TemplateRegistry

        registry = TemplateRegistry()
        registry.load_all()
        logger.info("Template registry loaded: %d templates", registry.template_count)
    except Exception:
        logger.warning("Template registry pre-load failed (non-fatal)")

    yield

    logger.info("Shutting down %s", settings.app_name)


# ---------------------------------------------------------------------------
# App Factory
# ---------------------------------------------------------------------------
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Exception Handlers ---
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "code": "INTERNAL_ERROR",
            },
        )

    # --- Health Check ---
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "healthy", "version": settings.app_version}

    # --- Mount API v1 Routers ---
    from app.api.v1.auth import router as auth_router
    from app.api.v1.providers import router as providers_router
    from app.api.v1.projects import router as projects_router
    from app.api.v1.experiments import router as experiments_router
    from app.api.v1.results import router as results_router
    from app.api.v1.feedback import router as feedback_router
    from app.api.v1.firewall import router as firewall_router
    from app.api.v1.organizations import router as organizations_router
    from app.api.v1.chat import router as chat_router

    prefix = settings.api_v1_prefix  # "/api/v1"

    app.include_router(auth_router, prefix=prefix, tags=["auth"])
    app.include_router(organizations_router, prefix=prefix, tags=["organizations"])
    app.include_router(providers_router, prefix=prefix, tags=["providers"])
    app.include_router(projects_router, prefix=prefix, tags=["projects"])
    app.include_router(experiments_router, prefix=prefix, tags=["experiments"])
    app.include_router(results_router, prefix=prefix, tags=["results"])
    app.include_router(feedback_router, prefix=prefix, tags=["feedback"])
    app.include_router(firewall_router, prefix=prefix, tags=["firewall"])
    app.include_router(chat_router, prefix=prefix, tags=["chat"])

    return app


# Module-level app instance (used by uvicorn: `uvicorn app.main:app`)
app = create_app()
