"""
Engine runner — Celery task entry point and orchestration loop.

Coordinates the full experiment pipeline:
  1. Load context
  2. Plan tests
  3. Generate prompts
  4. Execute against target in batches
  5. Judge each response
  6. Select representatives
  7. Compute analytics
  8. Finalise experiment
"""

from __future__ import annotations

import asyncio
import dataclasses
import logging
import time
from datetime import datetime, timezone
from uuid import UUID

import redis.asyncio as aioredis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.engine.context import (
    ExperimentContext,
    ProjectScope,
    ProviderInfo,
    TargetConfig,
)
from app.engine.executor import RateLimitExceeded, init_thread, send_prompt
from app.engine.generator import GeneratedPrompt, generate_prompts
from app.engine.judge import evaluate as judge_evaluate
from app.engine.planner import create_test_plan
from app.engine.sampler import select_representatives
from app.engine.scorer import compute_analytics, generate_insights
from app.services.encryption import decrypt_value
from app.services.llm_gateway import LLMGateway
from app.storage.database import create_standalone_session_factory
from app.storage.models.experiment import Experiment
from app.storage.models.project import Project
from app.storage.models.provider import ModelProvider
from app.storage.models.result import Result
from app.storage.models.test_case import TestCase

logger = logging.getLogger(__name__)

# Testing level → total test count
TESTING_LEVEL_COUNTS: dict[str, int] = {
    "basic": 500,
    "moderate": 1200,
    "aggressive": 2000,
}

# Engine settings
BATCH_SIZE = getattr(settings, "experiment_batch_size", 5)
ERROR_THRESHOLD_WINDOW = 50
ERROR_THRESHOLD_RATE = 0.60
INTER_REQUEST_DELAY = 1.0  # pause between LLM calls to respect Groq rate-limits


# ---------------------------------------------------------------------------
# Context loader
# ---------------------------------------------------------------------------


async def _load_context(
    experiment_id: UUID,
    session: AsyncSession,
) -> ExperimentContext:
    """Load experiment, project, and provider from DB; build context."""
    stmt = select(Experiment).where(Experiment.id == experiment_id)
    result = await session.execute(stmt)
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise ValueError(f"Experiment {experiment_id} not found")

    proj_stmt = select(Project).where(Project.id == experiment.project_id)
    project = (await session.execute(proj_stmt)).scalar_one_or_none()
    if not project:
        raise ValueError(f"Project {experiment.project_id} not found")

    prov_stmt = select(ModelProvider).where(ModelProvider.id == experiment.provider_id)
    provider = (await session.execute(prov_stmt)).scalar_one_or_none()
    if not provider:
        raise ValueError(f"Provider {experiment.provider_id} not found")

    # Parse target config
    tc_raw: dict = experiment.target_config or {}
    target = TargetConfig(
        endpoint_url=tc_raw.get("endpoint_url", ""),
        method=tc_raw.get("method", "POST"),
        headers=tc_raw.get("headers", {}),
        payload_template=tc_raw.get("payload_template", '{"prompt": "{{prompt}}"}'),
        response_json_path=tc_raw.get("response_json_path", "$.response"),
        auth_type=tc_raw.get("auth_type"),
        auth_value=tc_raw.get("auth_value"),
        timeout_seconds=tc_raw.get("timeout_seconds", 30),
        thread_endpoint_url=tc_raw.get("thread_endpoint_url"),
        thread_id_path=tc_raw.get("thread_id_path"),
        system_prompt=tc_raw.get("system_prompt"),
    )

    # Decrypt auth value if present
    if target.auth_value:
        try:
            target.auth_value = decrypt_value(target.auth_value)
        except Exception:
            pass  # May already be plaintext

    scope = ProjectScope(
        project_id=project.id,
        project_name=project.name,
        business_scope=project.business_scope or "",
        allowed_intents=project.allowed_intents or [],
        restricted_intents=project.restricted_intents or [],
        analyzed_scope=project.analyzed_scope,
    )

    prov_info = ProviderInfo(
        provider_id=provider.id,
        provider_type=provider.provider_type,
        api_key=decrypt_value(provider.encrypted_api_key),
        endpoint_url=provider.endpoint_url,
    )

    total_tests = TESTING_LEVEL_COUNTS.get(experiment.testing_level, 500)

    return ExperimentContext(
        experiment_id=experiment.id,
        experiment_type=experiment.experiment_type,
        sub_type=experiment.sub_type,
        turn_mode=experiment.turn_mode or "single_turn",
        testing_level=experiment.testing_level,
        language=experiment.language or "en",
        total_tests=total_tests,
        target=target,
        scope=scope,
        provider=prov_info,
        created_by_id=experiment.created_by_id,
    )


# ---------------------------------------------------------------------------
# Redis progress helpers
# ---------------------------------------------------------------------------


async def _get_redis() -> aioredis.Redis | None:
    try:
        return aioredis.Redis.from_url(
            str(settings.redis_connection_url),
            decode_responses=True,
        )
    except Exception:
        return None


async def _update_progress(
    experiment_id: UUID,
    completed: int,
    total: int,
):
    rd = await _get_redis()
    if rd:
        try:
            key = f"experiment:{experiment_id}:progress"
            await rd.set(key, f"{completed}/{total}", ex=86400)
            await rd.aclose()
        except Exception:
            pass


async def _check_cancelled(experiment_id: UUID) -> bool:
    rd = await _get_redis()
    if rd:
        try:
            flag = await rd.get(f"experiment:{experiment_id}:cancel")
            await rd.aclose()
            return flag is not None
        except Exception:
            pass
    return False


# ---------------------------------------------------------------------------
# Main execution pipeline
# ---------------------------------------------------------------------------


async def run_experiment_async(experiment_id: UUID) -> None:
    """Full async experiment execution pipeline."""
    start_time = time.monotonic()

    # Create a standalone engine + session factory for this event loop.
    # The global AsyncSessionLocal is bound to the *main* web-server loop;
    # using it from a background thread causes "Future attached to a
    # different loop".
    _engine, _SessionFactory = create_standalone_session_factory()

    try:
      async with _SessionFactory() as session:
        # --- 1. LOAD CONTEXT ---
        try:
            ctx = await _load_context(experiment_id, session)
        except Exception as e:
            logger.error("Failed to load experiment context: %s", e)
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status="failed",
                    error_message=str(e),
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()
            return

        # Set status → running
        await session.execute(
            update(Experiment)
            .where(Experiment.id == experiment_id)
            .values(
                status="running",
                started_at=datetime.now(timezone.utc),
                progress_total=ctx.total_tests,
                progress_completed=0,
            )
        )
        await session.commit()
        await _update_progress(experiment_id, 0, ctx.total_tests)

        # Build LLM gateway (provider.api_key is already decrypted)
        # Don't force a specific model — let the gateway pick a
        # provider-appropriate default (e.g. llama-3.3-70b-versatile for Groq).
        gateway = LLMGateway(
            provider_type=ctx.provider.provider_type,
            api_key=ctx.provider.api_key,
            endpoint_url=ctx.provider.endpoint_url,
        )

        # Validate provider credentials
        try:
            is_valid, val_error = await gateway.validate_credentials()
            if not is_valid:
                raise ValueError(val_error or "Provider credentials invalid")
        except Exception as e:
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status="failed",
                    error_message=f"Provider validation failed: {e}",
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()
            return

        # --- 2. PLAN ---
        try:
            plan = create_test_plan(ctx)
        except Exception as e:
            logger.exception("Test plan creation failed for %s", experiment_id)
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status="failed",
                    error_message=f"Test plan creation failed: {e}",
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()
            return

        # --- 3. GENERATE ---
        all_prompts: list[GeneratedPrompt] = []
        seq = 0
        try:
            for task in plan.tasks:
                # Load converters if enabled
                converters = None
                if plan.converters_enabled:
                    from app.engine.converters import get_all_converters
                    converters = get_all_converters()

                prompts = await generate_prompts(
                    task=task,
                    ctx=ctx,
                    gateway=gateway,
                    converters=converters,
                    converter_probability=plan.converter_probability,
                    max_converter_chain=plan.max_converter_chain,
                    augmentation_variants=plan.llm_augmentation_variants,
                    start_sequence=seq,
                )
                all_prompts.extend(prompts)
                seq += len(prompts)
        except RateLimitExceeded as e:
            logger.error("Prompt generation stopped — rate limit exceeded: %s", e)
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status="failed",
                    error_message=f"Rate limit exceeded during prompt generation: {e}",
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()
            return

        except Exception as e:
            logger.exception("Prompt generation failed for %s", experiment_id)
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status="failed",
                    error_message=f"Prompt generation failed: {e}",
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()
            return

        # Update total if generation produced different count
        actual_total = len(all_prompts)
        await session.execute(
            update(Experiment)
            .where(Experiment.id == experiment_id)
            .values(progress_total=actual_total)
        )
        await session.commit()

        # --- 4. EXECUTE LOOP ---
        completed = 0
        result_records: list[dict] = []
        recent_errors = 0
        recent_window: list[bool] = []  # True = error
        failure_reason: str | None = None  # Set if loop ends early

        try:
            for batch_start in range(0, actual_total, BATCH_SIZE):
                # Check cancellation
                if await _check_cancelled(experiment_id):
                    await session.execute(
                        update(Experiment)
                        .where(Experiment.id == experiment_id)
                        .values(
                            status="cancelled",
                            completed_at=datetime.now(timezone.utc),
                            progress_completed=completed,
                        )
                    )
                    await session.commit()
                    logger.info("Experiment %s cancelled", experiment_id)
                    # Still compute partial analytics below
                    failure_reason = "Experiment cancelled by user"
                    break

                batch = all_prompts[batch_start : batch_start + BATCH_SIZE]

                for gp in batch:
                    # Throttle to respect provider rate limits
                    await asyncio.sleep(INTER_REQUEST_DELAY)

                    # Execute against target
                    if gp.conversation_plan and ctx.turn_mode == "multi_turn":
                        # Multi-turn execution
                        response_text, latency_ms, conversation = await _execute_multi_turn(
                            ctx, gp, gateway
                        )
                    else:
                        # Single-turn execution
                        response_text, latency_ms = await send_prompt(
                            ctx.target, gp.prompt_text, gateway=gateway
                        )
                        conversation = None

                    # Judge
                    await asyncio.sleep(INTER_REQUEST_DELAY)
                    verdict = await judge_evaluate(
                        ctx=ctx,
                        gateway=gateway,
                        test_prompt=gp.prompt_text,
                        ai_response=response_text or "",
                        risk_category=gp.risk_category,
                        expected_behaviour=gp.expected_behaviour,
                        conversation=conversation,
                    )

                    # Write TestCase
                    tc = TestCase(
                        experiment_id=experiment_id,
                        prompt=gp.prompt_text,
                        response=response_text,
                        conversation=conversation,
                        risk_category=gp.risk_category,
                        data_strategy=gp.data_strategy,
                        attack_converter=gp.converter_applied,
                        sequence_order=gp.sequence_order,
                        is_representative=False,
                        latency_ms=latency_ms,
                    )
                    session.add(tc)
                    await session.flush()

                    # Write Result
                    res = Result(
                        test_case_id=tc.id,
                        result=verdict.status,
                        severity=verdict.severity,
                        confidence=verdict.confidence,
                        explanation=verdict.explanation,
                        owasp_mapping=gp.owasp_id,
                    )
                    session.add(res)

                    # Track for analytics
                    result_records.append({
                        "id": tc.id,
                        "status": verdict.status,
                        "severity": verdict.severity,
                        "risk_category": gp.risk_category,
                        "owasp_mapping": gp.owasp_id,
                        "confidence": verdict.confidence,
                        "latency_ms": latency_ms,
                    })

                    completed += 1

                    # Error threshold check
                    is_error = response_text is None or verdict.status == "error"
                    recent_window.append(is_error)
                    if len(recent_window) > ERROR_THRESHOLD_WINDOW:
                        recent_window.pop(0)
                    if len(recent_window) >= ERROR_THRESHOLD_WINDOW:
                        err_rate = sum(recent_window) / len(recent_window)
                        if err_rate > ERROR_THRESHOLD_RATE:
                            failure_reason = f"Error threshold exceeded: {err_rate:.0%} errors in last {ERROR_THRESHOLD_WINDOW} tests"
                            break

                # Break outer loop too if failure detected
                if failure_reason:
                    break

                # Commit batch & update progress
                await session.commit()
                await _update_progress(experiment_id, completed, actual_total)
                await session.execute(
                    update(Experiment)
                    .where(Experiment.id == experiment_id)
                    .values(progress_completed=completed)
                )
                await session.commit()

        except RateLimitExceeded as e:
            logger.error("Experiment %s stopped — rate limit exceeded at test %d: %s", experiment_id, completed, e)
            failure_reason = f"Rate limit exceeded: {e}"
            try:
                await session.rollback()
            except Exception:
                pass

        except Exception as e:
            logger.exception("Experiment %s execution failed at test %d: %s", experiment_id, completed, e)
            failure_reason = f"Execution failed after {completed} tests: {e}"
            try:
                await session.rollback()
            except Exception:
                pass

        # Commit any remaining unflushed test cases from the last batch
        if not failure_reason:
            try:
                await session.commit()
            except Exception:
                pass

        # --- 5. SAMPLE representatives ---
        tc_dicts = result_records
        rep_ids = select_representatives(tc_dicts, ctx.testing_level)

        if rep_ids:
            await session.execute(
                update(TestCase)
                .where(TestCase.id.in_(rep_ids))
                .values(is_representative=True)
            )
            await session.commit()

        # --- 6. SCORE — compute analytics (even for partial results) ---
        duration = int(time.monotonic() - start_time)
        analytics = compute_analytics(result_records, duration) if result_records else None

        if analytics:
            # Generate AI insights (skip for tiny partial runs)
            if not failure_reason or completed >= 10:
                try:
                    insight_items = await generate_insights(analytics, ctx, gateway)
                    analytics.insights = {
                        "summary": insight_items[0].description if insight_items else "",
                        "key_findings": [i.title for i in insight_items],
                        "risk_assessment": analytics.fail_impact,
                        "recommendations": [i.recommendation for i in insight_items],
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                    }
                except Exception:
                    pass

            # Write analytics to experiment
            analytics_dict = dataclasses.asdict(analytics)
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(analytics=analytics_dict)
            )
            await session.commit()

        # --- 7. FINALISE ---
        if failure_reason:
            final_status = "cancelled" if "cancelled" in failure_reason.lower() else "failed"
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status=final_status,
                    error_message=failure_reason,
                    completed_at=datetime.now(timezone.utc),
                    progress_completed=completed,
                )
            )
            await session.commit()
            logger.warning(
                "Experiment %s %s after %d tests: %s",
                experiment_id,
                final_status,
                completed,
                failure_reason,
            )
        else:
            await session.execute(
                update(Experiment)
                .where(Experiment.id == experiment_id)
                .values(
                    status="completed",
                    completed_at=datetime.now(timezone.utc),
                    progress_completed=completed,
                )
            )
            await session.commit()
            logger.info(
                "Experiment %s completed: %d tests, TPI=%.1f",
                experiment_id,
                completed,
                analytics.tpi_score if analytics else 0,
            )

        # Clean up Redis progress
        rd = await _get_redis()
        if rd:
            try:
                await rd.delete(f"experiment:{experiment_id}:progress")
                await rd.delete(f"experiment:{experiment_id}:cancel")
                await rd.aclose()
            except Exception:
                pass
    finally:
        # Dispose the standalone engine to release all connections
        await _engine.dispose()


# ---------------------------------------------------------------------------
# Multi-turn execution
# ---------------------------------------------------------------------------


async def _execute_multi_turn(
    ctx: ExperimentContext,
    gp: GeneratedPrompt,
    gateway: LLMGateway,
) -> tuple[str | None, int, list[dict]]:
    """Execute a multi-turn conversation and return (last_response, total_latency, conversation)."""
    conversation: list[dict] = []
    total_latency = 0
    last_response = None

    # Init thread if needed
    thread_id = None
    if ctx.target.thread_endpoint_url:
        thread_id = await init_thread(ctx.target)

    # Use the prompt as the first turn, then generate follow-ups
    turns = [gp.prompt_text]

    # If conversation_plan exists, use those turn texts
    if gp.conversation_plan:
        turns = [t.get("text", t.get("content", "")) for t in gp.conversation_plan]

    for turn_text in turns:
        conversation.append({"role": "user", "content": turn_text})
        response_text, latency = await send_prompt(
            ctx.target,
            turn_text,
            thread_id=thread_id,
            gateway=gateway,
        )
        total_latency += latency
        ai_text = response_text or ""
        conversation.append({"role": "assistant", "content": ai_text})
        last_response = ai_text

    return last_response, total_latency, conversation


# ---------------------------------------------------------------------------
# Sync entry point for Celery
# ---------------------------------------------------------------------------


def run_experiment(experiment_id: UUID) -> None:
    """Synchronous wrapper for Celery tasks."""
    asyncio.run(run_experiment_async(experiment_id))
