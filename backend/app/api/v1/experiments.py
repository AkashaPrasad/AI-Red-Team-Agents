"""
Experiments API routes — Phase 6.3

Create, list, detail, status polling, and cancel for experiments.
"""

from __future__ import annotations

from uuid import UUID

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user
from app.api.schemas.experiments import (
    ExperimentCreate,
    ExperimentList,
    ExperimentProgress,
    ExperimentResponse,
    ExperimentStatusResponse,
    ExperimentSummary,
    TargetConfigResponse,
    TESTING_LEVEL_COUNTS,
)
from app.api.schemas.shared import ProviderBrief, UserBrief
from app.config import settings
from app.services.audit import write_audit_log
from app.services.encryption import encrypt_value, mask_secret
from app.storage.database import get_async_session
from app.storage.models import Experiment, ModelProvider, Project, User

router = APIRouter(tags=["experiments"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mask_target_config(cfg: dict) -> TargetConfigResponse:
    """Sanitise target config for API responses."""
    auth_preview = None
    if cfg.get("auth_value"):
        auth_preview = mask_secret(cfg["auth_value"][:20]) if len(cfg.get("auth_value", "")) > 0 else None

    masked_headers = {}
    for k, v in cfg.get("headers", {}).items():
        if k.lower() in ("authorization", "x-api-key", "api-key"):
            masked_headers[k] = mask_secret(v)
        else:
            masked_headers[k] = v

    return TargetConfigResponse(
        endpoint_url=cfg.get("endpoint_url", ""),
        method=cfg.get("method", "POST"),
        headers=masked_headers,
        payload_template=cfg.get("payload_template", ""),
        auth_type=cfg.get("auth_type"),
        auth_value_preview=auth_preview,
        timeout_seconds=cfg.get("timeout_seconds", 30),
        thread_endpoint_url=cfg.get("thread_endpoint_url"),
        thread_id_path=cfg.get("thread_id_path"),
        system_prompt=cfg.get("system_prompt"),
    )


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(
        settings.redis_connection_url,
        decode_responses=True,
    )


async def _get_progress(experiment: Experiment) -> ExperimentProgress:
    """Read progress from Redis if running, else from DB."""
    total = experiment.progress_total
    completed = experiment.progress_completed

    if experiment.status == "running":
        try:
            r = await _get_redis()
            raw = await r.get(f"experiment:{experiment.id}:progress")
            await r.aclose()
            if raw and "/" in raw:
                parts = raw.split("/")
                completed = int(parts[0])
                total = int(parts[1])
        except Exception:
            pass

    pct = None
    if total and total > 0:
        pct = round(completed / total * 100, 1)

    return ExperimentProgress(total=total, completed=completed, percentage=pct)


def _to_response(experiment: Experiment, progress: ExperimentProgress) -> ExperimentResponse:
    provider_brief = None
    if experiment.provider:
        provider_brief = ProviderBrief(
            id=experiment.provider.id,
            name=experiment.provider.name,
            provider_type=experiment.provider.provider_type,
        )

    created_by = None
    if experiment.created_by:
        created_by = UserBrief(
            id=experiment.created_by.id,
            email=experiment.created_by.email,
            full_name=experiment.created_by.full_name,
        )

    analytics = None
    if experiment.status == "completed" and experiment.analytics:
        from app.api.schemas.experiments import ExperimentAnalytics
        analytics = ExperimentAnalytics(**experiment.analytics)

    return ExperimentResponse(
        id=experiment.id,
        project_id=experiment.project_id,
        name=experiment.name,
        description=experiment.description,
        experiment_type=experiment.experiment_type,
        sub_type=experiment.sub_type,
        turn_mode=experiment.turn_mode,
        testing_level=experiment.testing_level,
        language=experiment.language,
        target_config=_mask_target_config(experiment.target_config),
        status=experiment.status,
        progress=progress,
        analytics=analytics,
        provider=provider_brief,
        created_by=created_by,
        error_message=experiment.error_message,
        started_at=experiment.started_at,
        completed_at=experiment.completed_at,
        created_at=experiment.created_at,
        updated_at=experiment.updated_at,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/projects/{project_id}/experiments",
    response_model=ExperimentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_experiment(
    project_id: UUID,
    body: ExperimentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentResponse:
    """Create and launch a new experiment."""
    # Verify project
    proj_result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
    )
    project = proj_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify provider
    prov_result = await session.execute(
        select(ModelProvider).where(
            ModelProvider.id == body.provider_id,
            ModelProvider.owner_id == current_user.id,
        )
    )
    provider = prov_result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=400, detail="Provider not found")
    if not provider.is_valid:
        raise HTTPException(status_code=400, detail="Provider is not validated")

    # Build target config dict with encrypted auth_value
    tc_dict = body.target_config.model_dump()
    if tc_dict.get("auth_value"):
        tc_dict["auth_value"] = encrypt_value(tc_dict["auth_value"])

    experiment = Experiment(
        project_id=project_id,
        created_by_id=current_user.id,
        provider_id=body.provider_id,
        name=body.name,
        description=body.description,
        experiment_type=body.experiment_type,
        sub_type=body.sub_type,
        turn_mode=body.turn_mode,
        testing_level=body.testing_level,
        language=body.language,
        target_config=tc_dict,
        status="pending",
        progress_total=TESTING_LEVEL_COUNTS.get(body.testing_level, 500),
        progress_completed=0,
    )
    session.add(experiment)
    await session.flush()

    # Dispatch experiment execution.
    # In development, run in-process via asyncio.create_task (no Celery worker needed).
    # In production, dispatch to Celery.
    from app.config import settings as app_settings

    use_celery = app_settings.app_env == "production"

    if use_celery:
        try:
            from app.worker.tasks import run_experiment_task
            task = run_experiment_task.delay(str(experiment.id))
            experiment.celery_task_id = task.id
            await session.flush()
        except Exception:
            use_celery = False  # fall through to in-process

    if not use_celery:
        import asyncio as _asyncio
        from app.engine.runner import run_experiment_async
        # Commit so the background coroutine can read the experiment from DB
        await session.commit()
        _asyncio.get_event_loop().create_task(run_experiment_async(experiment.id))

    await write_audit_log(
        session,
        user=current_user,
        action="experiment.created",
        entity_type="experiment",
        entity_id=experiment.id,
        ip_address=request.client.host if request.client else None,
    )

    # Refresh all column attrs so nothing is expired, then set
    # relationships from objects we already have to avoid lazy loads.
    await session.refresh(experiment)
    experiment.provider = provider
    experiment.created_by = current_user
    progress = await _get_progress(experiment)
    return _to_response(experiment, progress)


@router.get("/projects/{project_id}/experiments", response_model=ExperimentList)
async def list_experiments(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    experiment_type: str | None = Query(None),
    sort_by: str = Query("created_at", pattern=r"^(name|created_at|status)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentList:
    """List experiments for a project."""
    # Verify project ownership
    proj_result = await session.execute(
        select(Project.id).where(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
    )
    if proj_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(Experiment).where(Experiment.project_id == project_id).options(
        joinedload(Experiment.created_by)
    )
    count_query = select(func.count()).select_from(Experiment).where(
        Experiment.project_id == project_id
    )

    if status_filter:
        query = query.where(Experiment.status == status_filter)
        count_query = count_query.where(Experiment.status == status_filter)
    if experiment_type:
        query = query.where(Experiment.experiment_type == experiment_type)
        count_query = count_query.where(Experiment.experiment_type == experiment_type)

    sort_col = {
        "name": Experiment.name,
        "status": Experiment.status,
        "created_at": Experiment.created_at,
    }[sort_by]
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    total = (await session.execute(count_query)).scalar_one()
    experiments = (await session.execute(query)).scalars().all()

    items = []
    for exp in experiments:
        progress = await _get_progress(exp)
        pass_rate = None
        if exp.status == "completed" and exp.analytics:
            pass_rate = exp.analytics.get("pass_rate")

        created_by = None
        if exp.created_by:
            created_by = UserBrief(
                id=exp.created_by.id,
                email=exp.created_by.email,
                full_name=exp.created_by.full_name,
            )

        items.append(ExperimentSummary(
            id=exp.id,
            name=exp.name,
            experiment_type=exp.experiment_type,
            sub_type=exp.sub_type,
            turn_mode=exp.turn_mode,
            testing_level=exp.testing_level,
            status=exp.status,
            progress=progress,
            pass_rate=pass_rate,
            created_by=created_by,
            started_at=exp.started_at,
            completed_at=exp.completed_at,
            created_at=exp.created_at,
        ))

    return ExperimentList.build(items=items, total=total, page=page, page_size=page_size)


@router.get("/projects/{project_id}/experiments/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(
    project_id: UUID,
    experiment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentResponse:
    experiment = await _get_experiment_or_404(experiment_id, current_user, session)
    progress = await _get_progress(experiment)
    return _to_response(experiment, progress)


@router.get("/projects/{project_id}/experiments/{experiment_id}/status", response_model=ExperimentStatusResponse)
async def get_experiment_status(
    project_id: UUID,
    experiment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentStatusResponse:
    experiment = await _get_experiment_or_404(experiment_id, current_user, session)
    progress = await _get_progress(experiment)
    return ExperimentStatusResponse(
        id=experiment.id,
        status=experiment.status,
        progress=progress,
        error_message=experiment.error_message,
        started_at=experiment.started_at,
        completed_at=experiment.completed_at,
    )


@router.post("/projects/{project_id}/experiments/{experiment_id}/cancel", response_model=ExperimentStatusResponse)
async def cancel_experiment(
    project_id: UUID,
    experiment_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ExperimentStatusResponse:
    experiment = await _get_experiment_or_404(experiment_id, current_user, session)

    if experiment.status not in ("pending", "running"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Experiment is not cancellable",
        )

    if experiment.status == "pending":
        experiment.status = "cancelled"
    else:
        # Set Redis cancellation flag for running experiment
        try:
            r = await _get_redis()
            await r.set(f"experiment:{experiment.id}:cancel", "true", ex=3600)
            await r.aclose()
        except Exception:
            pass
        experiment.status = "cancelled"

    await session.flush()

    await write_audit_log(
        session,
        user=current_user,
        action="experiment.cancelled",
        entity_type="experiment",
        entity_id=experiment.id,
        ip_address=request.client.host if request.client else None,
    )

    progress = await _get_progress(experiment)
    return ExperimentStatusResponse(
        id=experiment.id,
        status=experiment.status,
        progress=progress,
        error_message=experiment.error_message,
        started_at=experiment.started_at,
        completed_at=experiment.completed_at,
    )


# ---------------------------------------------------------------------------
# DELETE — delete an experiment
# ---------------------------------------------------------------------------


@router.delete(
    "/projects/{project_id}/experiments/{experiment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_experiment(
    project_id: UUID,
    experiment_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Delete an experiment and all its test cases / results / feedback (cascade)."""
    experiment = await _get_experiment_or_404(experiment_id, current_user, session)

    if experiment.status == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a running experiment. Cancel it first.",
        )

    await write_audit_log(
        session,
        user=current_user,
        action="experiment.deleted",
        entity_type="experiment",
        entity_id=experiment.id,
        ip_address=request.client.host if request.client else None,
    )

    await session.delete(experiment)
    await session.flush()

    from fastapi.responses import Response
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_experiment_or_404(
    experiment_id: UUID,
    user: User,
    session: AsyncSession,
) -> Experiment:
    result = await session.execute(
        select(Experiment)
        .where(Experiment.id == experiment_id)
        .options(
            joinedload(Experiment.provider),
            joinedload(Experiment.created_by),
        )
    )
    experiment = result.unique().scalar_one_or_none()
    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Verify ownership via project
    proj_result = await session.execute(
        select(Project.owner_id).where(Project.id == experiment.project_id)
    )
    owner_id = proj_result.scalar_one_or_none()
    if owner_id != user.id:
        raise HTTPException(status_code=404, detail="Experiment not found")

    return experiment
