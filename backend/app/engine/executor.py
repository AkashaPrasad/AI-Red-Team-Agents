"""
Target AI executor — sends prompts to the target AI and extracts responses.

Handles HTTP invocation, auth injection, payload template rendering,
timeout, retry with exponential backoff, and response JSON-path extraction.

Also supports *direct provider* mode: when ``endpoint_url`` starts with
``direct://<provider_id>``, the executor calls the platform's LLMGateway
in-process, bypassing HTTP entirely.
"""

from __future__ import annotations

import json
import logging
import re
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from app.engine.context import TargetConfig

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# JSON-path mini-extractor (supports simple dot-notation / bracket paths)
# ---------------------------------------------------------------------------


def _extract_json_path(data: dict | list, path: str) -> str | None:
    """
    Simple JSON-path extractor supporting ``$.field.sub`` and ``$.field[0]``.
    """
    if not path or path == "$":
        return json.dumps(data) if isinstance(data, (dict, list)) else str(data)

    parts = path.lstrip("$").lstrip(".")
    current = data
    for part in re.split(r"\.|(?=\[)", parts):
        if not part:
            continue
        # Array index: [0]
        m = re.match(r"\[(\d+)]", part)
        if m:
            idx = int(m.group(1))
            if isinstance(current, list) and idx < len(current):
                current = current[idx]
            else:
                return None
        elif isinstance(current, dict):
            current = current.get(part)
            if current is None:
                return None
        else:
            return None

    if isinstance(current, str):
        return current
    return json.dumps(current) if current is not None else None


# ---------------------------------------------------------------------------
# Send prompt to target AI
# ---------------------------------------------------------------------------


async def send_prompt(
    target: "TargetConfig",
    prompt: str,
    *,
    thread_id: str | None = None,
    retries: int = 3,
    backoff_base: float = 2.0,
) -> tuple[str | None, int]:
    """
    Send a prompt to the target AI and return (response_text, latency_ms).

    Returns (None, latency_ms) if all retries are exhausted.
    """
    import asyncio
    import time

    # ── Direct Provider shortcut ──
    if target.endpoint_url.startswith("direct://"):
        return await _send_direct(target, prompt)

    # Build payload from template
    payload_str = target.payload_template.replace("{{prompt}}", prompt)
    if thread_id and "{{thread_id}}" in payload_str:
        payload_str = payload_str.replace("{{thread_id}}", thread_id)
    if target.system_prompt and "{{system_prompt}}" in payload_str:
        payload_str = payload_str.replace("{{system_prompt}}", target.system_prompt)

    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        payload = {"prompt": prompt}

    # Auto-inject system prompt into "messages" array if present and not
    # already handled via the {{system_prompt}} placeholder
    if target.system_prompt and "{{system_prompt}}" not in target.payload_template:
        if isinstance(payload, dict) and "messages" in payload and isinstance(payload["messages"], list):
            payload["messages"].insert(0, {"role": "system", "content": target.system_prompt})

    # Build headers
    headers = dict(target.headers) if target.headers else {}
    headers.setdefault("Content-Type", "application/json")

    # Inject auth
    if target.auth_type == "bearer" and target.auth_value:
        headers["Authorization"] = f"Bearer {target.auth_value}"
    elif target.auth_type == "api_key" and target.auth_value:
        headers["X-API-Key"] = target.auth_value
    elif target.auth_type == "basic" and target.auth_value:
        import base64
        encoded = base64.b64encode(target.auth_value.encode()).decode()
        headers["Authorization"] = f"Basic {encoded}"

    timeout = httpx.Timeout(float(target.timeout_seconds), connect=10.0)

    for attempt in range(retries):
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if target.method.upper() == "GET":
                    resp = await client.get(target.endpoint_url, headers=headers, params=payload)
                else:
                    resp = await client.post(target.endpoint_url, headers=headers, json=payload)

            latency_ms = int((time.monotonic() - start) * 1000)

            if resp.status_code >= 400:
                if attempt < retries - 1:
                    await asyncio.sleep(backoff_base ** attempt)
                    continue
                return None, latency_ms

            # Extract response
            try:
                resp_data = resp.json()
                extracted = _extract_json_path(resp_data, target.response_json_path)
                return extracted or resp.text, latency_ms
            except Exception:
                return resp.text, latency_ms

        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
            latency_ms = int((time.monotonic() - start) * 1000)
            if attempt < retries - 1:
                await asyncio.sleep(backoff_base ** attempt)
                continue
            return None, latency_ms

    return None, 0


# ---------------------------------------------------------------------------
# Multi-turn: init thread
# ---------------------------------------------------------------------------


async def init_thread(target: "TargetConfig") -> str | None:
    """
    Call the thread_endpoint_url to create a new conversation thread.
    Returns the thread_id extracted via thread_id_path.
    """
    if not target.thread_endpoint_url:
        return None

    headers = dict(target.headers) if target.headers else {}
    headers.setdefault("Content-Type", "application/json")

    if target.auth_type == "bearer" and target.auth_value:
        headers["Authorization"] = f"Bearer {target.auth_value}"

    timeout = httpx.Timeout(float(target.timeout_seconds), connect=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                target.thread_endpoint_url,
                headers=headers,
                json={},
            )
        if resp.status_code < 400:
            data = resp.json()
            if target.thread_id_path:
                return _extract_json_path(data, target.thread_id_path)
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Direct Provider — call LLMGateway in-process (no HTTP round-trip)
# ---------------------------------------------------------------------------

async def _send_direct(
    target: "TargetConfig",
    prompt: str,
) -> tuple[str | None, int]:
    """
    Send a prompt through the platform's LLMGateway by loading the provider
    from the database.  The ``direct://<provider_id>`` URL pattern signals
    this code path.

    Returns (response_text, latency_ms).
    """
    import time
    from uuid import UUID

    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.services.llm_gateway import LLMGateway
    from app.storage.database import AsyncSessionLocal
    from app.storage.models.provider import ModelProvider

    provider_id_str = target.endpoint_url.removeprefix("direct://")
    start = time.monotonic()

    try:
        provider_uuid = UUID(provider_id_str)
    except ValueError:
        logger.error("Invalid provider UUID in direct:// URL: %s", provider_id_str)
        return None, 0

    try:
        async with AsyncSessionLocal() as session:  # type: AsyncSession
            row = await session.execute(
                select(ModelProvider).where(ModelProvider.id == provider_uuid)
            )
            provider = row.scalar_one_or_none()

        if provider is None:
            logger.error("Provider %s not found for direct mode", provider_id_str)
            return None, 0

        # Build gateway (encrypted_api_key is decrypted inside the gateway)
        gateway = LLMGateway(
            provider_type=provider.provider_type,
            encrypted_api_key=provider.encrypted_api_key,
            endpoint_url=provider.endpoint_url,
            model=provider.model,
        )

        messages = []
        if target.system_prompt:
            messages.append({"role": "system", "content": target.system_prompt})
        messages.append({"role": "user", "content": prompt})
        response_text = await gateway.chat(messages)
        latency_ms = int((time.monotonic() - start) * 1000)
        return response_text, latency_ms

    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.exception("Direct provider call failed for %s: %s", provider_id_str, exc)
        return None, latency_ms
