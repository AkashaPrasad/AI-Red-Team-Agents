"""
Results API routes (Phase 6.4).

Read-only endpoints for viewing experiment results — dashboard, logs list,
and log detail.  All data is accessed through the parent experiment which
must belong to a project within the authenticated user's organization.
"""

from __future__ import annotations

import base64
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, exists, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import require_member
from app.api.schemas.results import (
    CategoryBreakdownItem,
    ConversationTurn,
    DashboardResponse,
    ExperimentInsights,
    FailImpact,
    FeedbackSnapshot,
    LogDetailResponse,
    LogEntry,
    LogList,
    SeverityBreakdown,
)
from app.storage.database import get_async_session
from app.storage.models.experiment import Experiment
from app.storage.models.feedback import Feedback
from app.storage.models.project import Project
from app.storage.models.result import Result
from app.storage.models.test_case import TestCase
from app.storage.models.user import User

router = APIRouter(tags=["results"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SORT_COLUMNS = {
    "sequence_order": TestCase.sequence_order,
    "created_at": TestCase.created_at,
    "severity": Result.severity,
    "result": Result.result,
}


async def _get_experiment_or_404(
    experiment_id: UUID,
    user: User,
    session: AsyncSession,
) -> Experiment:
    stmt = (
        select(Experiment)
        .join(Project, Experiment.project_id == Project.id)
        .where(
            Experiment.id == experiment_id,
            Project.owner_id == user.id,
        )
    )
    result = await session.execute(stmt)
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(status_code=404, detail="EXPERIMENT_NOT_FOUND")
    return experiment


def _encode_cursor(sort_value: str, record_id: UUID) -> str:
    payload = json.dumps({"s": str(sort_value), "id": str(record_id)})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[str, UUID]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return payload["s"], UUID(payload["id"])
    except Exception:
        raise HTTPException(status_code=400, detail="INVALID_CURSOR")


def _compute_fail_impact(analytics: dict) -> FailImpact | None:
    sev = analytics.get("severity_breakdown", {})
    h = sev.get("high", 0)
    m = sev.get("medium", 0)
    l_ = sev.get("low", 0)
    if h + m + l_ == 0:
        return None
    if h >= 5:
        level = "critical"
    elif h >= 1:
        level = "high"
    elif m >= 3:
        level = "medium"
    else:
        level = "low"
    parts = []
    if h:
        parts.append(f"{h} high-severity")
    if m:
        parts.append(f"{m} medium-severity")
    if l_:
        parts.append(f"{l_} low-severity")
    summary = f"{', '.join(parts)} failure{'s' if h + m + l_ > 1 else ''} detected"
    return FailImpact(
        level=level,
        high_count=h,
        medium_count=m,
        low_count=l_,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# 1. Dashboard — GET /experiments/{experiment_id}/dashboard
# ---------------------------------------------------------------------------


@router.get(
    "/experiments/{experiment_id}/dashboard",
    response_model=DashboardResponse,
)
async def get_dashboard(
    experiment_id: UUID,
    user: User = Depends(require_member),
    session: AsyncSession = Depends(get_async_session),
):
    experiment = await _get_experiment_or_404(experiment_id, user, session)

    if experiment.status not in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail="EXPERIMENT_NOT_COMPLETED")

    analytics: dict = experiment.analytics or {}

    sev_raw = analytics.get("severity_breakdown", {})
    severity_breakdown = SeverityBreakdown(
        high=sev_raw.get("high", 0),
        medium=sev_raw.get("medium", 0),
        low=sev_raw.get("low", 0),
    )

    category_breakdown = [
        CategoryBreakdownItem(**cat)
        for cat in analytics.get("category_breakdown", [])
    ]

    insights_raw = analytics.get("insights")
    insights = ExperimentInsights(**insights_raw) if insights_raw else None

    fail_impact = _compute_fail_impact(analytics)

    total = analytics.get("total_tests", experiment.progress_total or 0)
    passed = analytics.get("passed", 0)
    failed = analytics.get("failed", 0)
    errors = analytics.get("errors", 0)
    pass_rate = (passed / total) if total > 0 else 0.0
    error_rate = (errors / total) if total > 0 else 0.0

    duration_seconds = None
    if experiment.started_at and experiment.completed_at:
        duration_seconds = int(
            (experiment.completed_at - experiment.started_at).total_seconds()
        )

    return DashboardResponse(
        experiment_id=experiment.id,
        experiment_name=experiment.name,
        experiment_type=experiment.experiment_type,
        sub_type=experiment.sub_type,
        status=experiment.status,
        total_tests=total,
        passed=passed,
        failed=failed,
        errors=errors,
        pass_rate=round(pass_rate, 4),
        error_rate=round(error_rate, 4),
        fail_impact=fail_impact,
        severity_breakdown=severity_breakdown,
        category_breakdown=category_breakdown,
        insights=insights,
        started_at=experiment.started_at,
        completed_at=experiment.completed_at,
        duration_seconds=duration_seconds,
    )


# ---------------------------------------------------------------------------
# 2. Logs list — GET /experiments/{experiment_id}/logs
# ---------------------------------------------------------------------------


@router.get(
    "/experiments/{experiment_id}/logs",
    response_model=LogList,
)
async def list_logs(
    experiment_id: UUID,
    cursor: str | None = Query(None),
    page_size: int = Query(50, ge=1, le=100),
    result_filter: str | None = Query(None, alias="result"),
    severity: str | None = Query(None),
    risk_category: str | None = Query(None, max_length=50),
    data_strategy: str | None = Query(None, max_length=100),
    is_representative: bool | None = Query(None),
    search: str | None = Query(None, max_length=200),
    sort_by: str = Query("sequence_order"),
    sort_order: str = Query("asc"),
    user: User = Depends(require_member),
    session: AsyncSession = Depends(get_async_session),
):
    experiment = await _get_experiment_or_404(experiment_id, user, session)

    # Base query: test_cases LEFT JOIN results
    stmt = (
        select(TestCase, Result)
        .outerjoin(Result, Result.test_case_id == TestCase.id)
        .where(TestCase.experiment_id == experiment.id)
    )

    # --- Filters ---
    if result_filter:
        stmt = stmt.where(Result.result == result_filter)
    if severity:
        stmt = stmt.where(Result.severity == severity)
    if risk_category:
        stmt = stmt.where(TestCase.risk_category == risk_category)
    if data_strategy:
        stmt = stmt.where(TestCase.data_strategy == data_strategy)
    if is_representative is not None:
        stmt = stmt.where(TestCase.is_representative == is_representative)
    if search:
        stmt = stmt.where(TestCase.prompt.ilike(f"%{search}%"))

    # --- Total count ---
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    # --- Sorting ---
    sort_col = SORT_COLUMNS.get(sort_by, TestCase.sequence_order)
    if sort_order == "desc":
        stmt = stmt.order_by(sort_col.desc(), TestCase.id.desc())
    else:
        stmt = stmt.order_by(sort_col.asc(), TestCase.id.asc())

    # --- Cursor ---
    if cursor:
        cursor_sort_val, cursor_id = _decode_cursor(cursor)
        if sort_order == "desc":
            stmt = stmt.where(
                (sort_col < cursor_sort_val)
                | (and_(sort_col == cursor_sort_val, TestCase.id < cursor_id))
            )
        else:
            stmt = stmt.where(
                (sort_col > cursor_sort_val)
                | (and_(sort_col == cursor_sort_val, TestCase.id > cursor_id))
            )

    # Fetch page_size + 1 to detect next page
    stmt = stmt.limit(page_size + 1)
    rows = (await session.execute(stmt)).all()

    has_next = len(rows) > page_size
    page_rows = rows[:page_size]

    # --- Check has_feedback for current user (batch) ---
    tc_ids = [tc.id for tc, _ in page_rows]
    feedback_set: set[UUID] = set()
    if tc_ids:
        fb_stmt = select(Feedback.test_case_id).where(
            Feedback.test_case_id.in_(tc_ids),
            Feedback.user_id == user.id,
        )
        fb_rows = (await session.execute(fb_stmt)).scalars().all()
        feedback_set = set(fb_rows)

    # --- Build entries ---
    items: list[LogEntry] = []
    last_sort_value = None
    last_id: UUID | None = None
    for tc, res in page_rows:
        prompt_preview = tc.prompt[:200] if tc.prompt else ""
        items.append(
            LogEntry(
                test_case_id=tc.id,
                sequence_order=tc.sequence_order,
                prompt_preview=prompt_preview,
                result=res.result if res else "error",
                severity=res.severity if res else None,
                risk_category=tc.risk_category,
                owasp_mapping=res.owasp_mapping if res else None,
                confidence=res.confidence if res else None,
                is_representative=tc.is_representative,
                data_strategy=tc.data_strategy,
                latency_ms=tc.latency_ms,
                has_feedback=tc.id in feedback_set,
                created_at=tc.created_at,
            )
        )
        # Track last row for cursor
        if sort_by == "severity":
            last_sort_value = res.severity if res else ""
        elif sort_by == "result":
            last_sort_value = res.result if res else ""
        elif sort_by == "created_at":
            last_sort_value = tc.created_at.isoformat() if tc.created_at else ""
        else:
            last_sort_value = str(tc.sequence_order)
        last_id = tc.id

    next_cursor = None
    if has_next and last_id is not None:
        next_cursor = _encode_cursor(str(last_sort_value), last_id)

    return LogList(
        items=items,
        total=total,
        next_cursor=next_cursor,
        has_more=has_next,
    )


# ---------------------------------------------------------------------------
# 3. Log detail — GET /experiments/{experiment_id}/logs/{test_case_id}
# ---------------------------------------------------------------------------


@router.get(
    "/experiments/{experiment_id}/logs/{test_case_id}",
    response_model=LogDetailResponse,
)
async def get_log_detail(
    experiment_id: UUID,
    test_case_id: UUID,
    user: User = Depends(require_member),
    session: AsyncSession = Depends(get_async_session),
):
    experiment = await _get_experiment_or_404(experiment_id, user, session)

    # Fetch test case with result eagerly
    stmt = (
        select(TestCase)
        .options(joinedload(TestCase.result))
        .where(
            TestCase.id == test_case_id,
            TestCase.experiment_id == experiment.id,
        )
    )
    row = await session.execute(stmt)
    tc = row.scalar_one_or_none()
    if not tc:
        raise HTTPException(status_code=404, detail="TEST_CASE_NOT_FOUND")

    res = tc.result

    # Parse conversation
    conversation = None
    if tc.conversation:
        raw = tc.conversation if isinstance(tc.conversation, list) else []
        conversation = [ConversationTurn(**turn) for turn in raw]

    # Lookup current user's feedback
    fb_stmt = select(Feedback).where(
        Feedback.test_case_id == tc.id,
        Feedback.user_id == user.id,
    )
    fb_row = await session.execute(fb_stmt)
    fb = fb_row.scalar_one_or_none()

    my_feedback = None
    if fb:
        my_feedback = FeedbackSnapshot(
            id=fb.id,
            vote=fb.vote,
            correction=fb.correction,
            comment=fb.comment,
            created_at=fb.created_at,
        )

    return LogDetailResponse(
        test_case_id=tc.id,
        experiment_id=experiment.id,
        sequence_order=tc.sequence_order,
        prompt=tc.prompt,
        response=tc.response,
        conversation_turns=conversation,
        risk_category=tc.risk_category,
        data_strategy=tc.data_strategy,
        attack_converter=tc.attack_converter,
        is_representative=tc.is_representative,
        latency_ms=tc.latency_ms,
        result=res.result if res else "error",
        severity=res.severity if res else None,
        confidence=res.confidence if res else None,
        explanation=res.explanation if res else None,
        owasp_mapping=res.owasp_mapping if res else None,
        my_feedback=my_feedback,
        created_at=tc.created_at,
    )
