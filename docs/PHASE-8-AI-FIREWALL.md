# Phase 8 — AI Firewall: Real-Time Protection System

> **Status**: DRAFT — AWAITING APPROVAL  
> **Depends on**: Phase 2 (Architecture), Phase 5 (Database), Phase 6.6 (Firewall API)  
> **Scope**: End-to-end design of the real-time AI Firewall — request interception, multi-layer evaluation, verdict delivery, latency-safe architecture, and deployment patterns.

---

## Table of Contents

1. [Overview & Purpose](#1-overview--purpose)
2. [System Context](#2-system-context)
3. [Request Interception](#3-request-interception)
4. [Evaluation Pipeline](#4-evaluation-pipeline)
5. [Verdict Model](#5-verdict-model)
6. [Latency-Safe Design](#6-latency-safe-design)
7. [Caching Architecture](#7-caching-architecture)
8. [Rate Limiting](#8-rate-limiting)
9. [Security Model](#9-security-model)
10. [Observability & Logging](#10-observability--logging)
11. [Deployment Patterns](#11-deployment-patterns)
12. [API Contract Reference](#12-api-contract-reference)
13. [Failure Modes & Resilience](#13-failure-modes--resilience)
14. [Configuration Reference](#14-configuration-reference)
15. [Future Considerations (v2)](#15-future-considerations-v2)

---

## 1. Overview & Purpose

The AI Firewall is a **real-time prompt evaluation gateway** that sits between a customer's application and their AI system. Every user prompt is intercepted, evaluated against the project's defined scope, intents, and custom rules, and classified as **allow**, **warn**, or **block** — all within a 500ms latency budget.

### What It Solves

| Problem | Firewall Solution |
|---------|-------------------|
| Users sending out-of-scope prompts to an AI | Scope-aware evaluation rejects off-topic requests |
| Prompt injection attacks in production | Pattern rules + LLM judge detect adversarial inputs |
| Policy violations in real-time | Restricted intents enforced with high confidence |
| Lack of visibility into production AI usage | Every evaluation logged with verdict, latency, and category |
| Manual moderation doesn't scale | Automated, sub-second verdicts at 100+ req/min |

### Key Design Principles

1. **Latency is king** — every design decision optimizes for < 500ms total response time
2. **Fail-closed by default** — if the evaluation system fails, the prompt is blocked (not silently passed)
3. **Defence in depth** — fast pattern rules first, then LLM-as-Judge for nuanced evaluation
4. **Zero-echo** — verdict responses never leak the original prompt, scope, or internal configuration
5. **Fire-and-forget logging** — log writes are async and never add latency to the verdict response

---

## 2. System Context

### Where the Firewall Sits

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Customer's Application                           │
│                                                                      │
│  ┌──────────┐         ┌───────────────────────┐         ┌─────────┐ │
│  │          │  HTTP   │  Application Server    │  HTTP   │         │ │
│  │ End User │────────▶│                        │────────▶│ AI      │ │
│  │          │         │  1. Receive prompt      │         │ System  │ │
│  └──────────┘         │  2. ──▶ Firewall ──────│────┐    │         │ │
│                       │  3. Check verdict       │    │    └─────────┘ │
│                       │  4a. allow → forward    │    │                │
│                       │  4b. block → reject     │    │                │
│                       │  4c. warn  → flag+fwd   │    │                │
│                       └───────────────────────┘    │                │
└────────────────────────────────────────────────────│────────────────┘
                                                     │
                    ┌────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Our Platform (Self-Hosted)                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Load Balancer (nginx)                        │  │
│  │         /api/v1/firewall/* → tighter timeouts (10s read)       │  │
│  └──────────────────────┬─────────────────────────────────────────┘  │
│                         │                                            │
│            ┌────────────┼────────────┐                               │
│            ▼            ▼            ▼                               │
│      ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│      │ FastAPI  │ │ FastAPI  │ │ FastAPI  │   N stateless instances  │
│      │ Server 1 │ │ Server 2 │ │ Server N │                          │
│      └────┬─────┘ └────┬─────┘ └────┬─────┘                         │
│           │             │            │                               │
│           └─────────────┼────────────┘                               │
│                    ┌────┴────┐                                       │
│                    ▼         ▼                                       │
│              ┌──────────┐ ┌────────────┐                             │
│              │  Redis   │ │ PostgreSQL │                              │
│              │ • Cache  │ │ • Rules    │                              │
│              │ • Rate   │ │ • Logs     │                              │
│              │   limits │ │ • Scope    │                              │
│              └──────────┘ └────────────┘                             │
│                    │                                                 │
│                    ▼                                                 │
│              ┌─────────────┐                                         │
│              │ LLM Provider│  (OpenAI / Azure OpenAI)                │
│              │  via Gateway│                                         │
│              └─────────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Integration Model

The firewall is a **sidecar gateway**, not an inline proxy. The customer's application makes an explicit HTTP call before forwarding to their AI:

```python
# Customer's application code
verdict = firewall.evaluate(user_prompt)
if verdict.status:        # allow
    response = my_ai.chat(user_prompt)
elif verdict.warn:        # warn — customer decides
    log_warning(verdict)
    response = my_ai.chat(user_prompt)
else:                     # block
    response = "I can't help with that request."
```

**Why sidecar, not inline proxy:**

| Consideration | Sidecar (our approach) | Inline Proxy |
|---------------|----------------------|--------------|
| Customer control | Full — decides how to handle each verdict | Limited — binary pass/block |
| Latency isolation | Parallel or sequential, customer's choice | Always in critical path |
| Failure handling | Customer defines fallback | Proxy failure = total outage |
| Integration effort | One HTTP call | Reconfigure all AI routing |
| Streaming support | No conflict (firewall evaluates before stream starts) | Must buffer entire stream |

---

## 3. Request Interception

### 3.1 Entry Point

```
POST /api/v1/firewall/{project_id}
Authorization: Bearer <project-api-key>
Content-Type: application/json

{
    "prompt": "How do I reset my password?",
    "agent_prompt": "You are a customer support assistant for Acme Corp..."
}
```

| Field | Required | Max Length | Purpose |
|-------|----------|-----------|---------|
| `prompt` | Yes | 10,000 chars | The user prompt to evaluate |
| `agent_prompt` | No | 10,000 chars | System/agent prompt for context-aware evaluation |

### 3.2 Authentication Flow

```
Request arrives
    │
    ▼
Extract Authorization: Bearer <key>
    │
    ▼
SHA-256 hash the key
    │
    ├──▶ Check Redis cache: firewall:auth:{hash}
    │       │
    │       ├── HIT → project_id (or "null" = invalid)
    │       │
    │       └── MISS ──▶ Query DB: SELECT id FROM projects
    │                        WHERE api_key_hash = {hash}
    │                          AND is_active = true
    │                    │
    │                    ├── Found → cache project_id (TTL 5 min) → continue
    │                    └── Not found → cache "null" (TTL 5 min) → 401
    │
    └── No header → 401 INVALID_API_KEY
```

**Design decisions:**
- **SHA-256 comparison** (not plaintext) — API key is never stored in raw form. Same as GitHub's token approach.
- **Negative caching** — invalid key hashes are cached as `"null"` for 5 minutes to prevent repeated DB lookups from brute-force attempts.
- **5-minute TTL** — balances freshness (key regeneration propagates within 5 min) vs. performance (no DB hit on hot path).

### 3.3 Input Validation

| Check | Threshold | Response |
|-------|-----------|----------|
| Missing prompt | Empty or whitespace | 400 `PROMPT_REQUIRED` |
| Prompt too long | > 10,000 chars | 400 `PROMPT_TOO_LONG` |
| Agent prompt too long | > 10,000 chars | 400 `AGENT_PROMPT_TOO_LONG` |
| Malformed JSON | Parse error | 422 (FastAPI default) |

Validation is the **first** processing step after auth — reject invalid input before any Redis or LLM calls.

---

## 4. Evaluation Pipeline

### 4.1 Pipeline Overview

The evaluation pipeline is a **three-layer waterfall**. Each layer can produce a final verdict independently. Later layers are only reached if earlier layers don't match.

```
                    ┌─────────────────────────┐
                    │   1. API Key Auth        │─── 401
                    └───────────┬─────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │   2. Rate Limit Check    │─── 429
                    └───────────┬─────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │   3. Input Validation    │─── 400
                    └───────────┬─────────────┘
                                ▼
        ┌───────────────────────────────────────────────┐
        │          LAYER 1: Pattern Rules                │
        │          (regex, ~1ms, deterministic)          │
        │                                               │
        │  ┌──────────────────────┐                     │
        │  │ block_pattern rules  │──── MATCH ──▶ BLOCK │
        │  │ (priority-ordered)   │                     │
        │  └──────────┬───────────┘                     │
        │             ▼                                 │
        │  ┌──────────────────────┐                     │
        │  │ allow_pattern rules  │──── MATCH ──▶ ALLOW │
        │  │ (priority-ordered)   │                     │
        │  └──────────┬───────────┘                     │
        │             │ NO MATCH                        │
        └─────────────┼────────────────────────────────┘
                      ▼
        ┌───────────────────────────────────────────────┐
        │          LAYER 2: Custom Policy Rules          │
        │          (injected into LLM context)           │
        │                                               │
        │  Custom policies are appended to the LLM      │
        │  judge prompt as additional evaluation         │
        │  criteria — they don't produce verdicts        │
        │  independently; they enrich Layer 3.           │
        └───────────────────┬───────────────────────────┘
                            ▼
        ┌───────────────────────────────────────────────┐
        │          LAYER 3: LLM-as-Judge                 │
        │          (~300-400ms, context-aware)            │
        │                                               │
        │  System prompt includes:                      │
        │  • Project business scope                     │
        │  • Allowed intents                            │
        │  • Restricted intents                         │
        │  • Custom policy rules (from Layer 2)         │
        │  • Agent/system prompt context (if provided)  │
        │                                               │
        │  Returns structured JSON verdict:             │
        │  { status, fail_category, explanation,        │
        │    confidence }                               │
        └───────────────────┬───────────────────────────┘
                            ▼
                    ┌───────────────────┐
                    │  Async Log Write  │  (fire-and-forget)
                    └───────────┬───────┘
                                ▼
                    ┌───────────────────┐
                    │  Return Verdict   │
                    └───────────────────┘
```

### 4.2 Layer 1 — Pattern Rules (Fast Path)

Pattern rules are the **first line of defence** — deterministic regex matches evaluated in priority order.

```python
# Evaluation logic (simplified)
for rule in active_rules_sorted_by_priority:
    if rule.rule_type == "block_pattern":
        if re.search(rule.pattern, prompt, re.IGNORECASE):
            return BLOCK(
                fail_category="restriction",
                explanation=f"Blocked by pattern rule: {rule.name}",
                confidence=1.0,
                matched_rule=rule.name,
            )
    elif rule.rule_type == "allow_pattern":
        if re.search(rule.pattern, prompt, re.IGNORECASE):
            return ALLOW(
                explanation=f"Allowed by pattern rule: {rule.name}",
                confidence=1.0,
                matched_rule=rule.name,
            )
```

**Performance characteristics:**
- Rules are loaded from Redis cache (TTL 5 min)
- Compiled regex evaluation: < 1ms for typical rule sets (< 50 rules)
- Short-circuits on first match — priority ordering matters
- ReDoS protection: regex execution bounded at 100ms timeout

**Rule priority semantics:**
- Lower number = evaluated first (priority 0 before priority 100)
- Block rules and allow rules are interleaved by priority — a priority-0 allow rule beats a priority-1 block rule
- If no pattern matches, evaluation falls through to Layer 3

### 4.3 Layer 2 — Custom Policy Rules (Context Enrichment)

Custom policy rules are **not evaluated independently**. They are natural-language policies injected into the LLM-as-Judge system prompt to extend evaluation criteria beyond the project's base scope/intents.

```
Example custom policies:
  1. "Never discuss competitor products by name"
  2. "Responses about pricing must include a disclaimer about regional variations"
  3. "Reject any prompt asking for legal or medical advice"
```

These are appended to the LLM judge prompt:

```
...
Custom policies to enforce:
  1. Never discuss competitor products by name
  2. Responses about pricing must include a disclaimer about regional variations
  3. Reject any prompt asking for legal or medical advice
...
```

The LLM judge evaluates the user prompt against **all context simultaneously** — scope, intents, and custom policies — in a single call.

### 4.4 Layer 3 — LLM-as-Judge (Deep Evaluation)

When no pattern rule matches, the LLM-as-Judge provides nuanced, context-aware evaluation.

**Judge system prompt construction:**

```
You are an AI Firewall judge. Evaluate whether the user prompt is safe
and within scope.

Respond ONLY with a JSON object:
{"status": bool, "fail_category": str|null, "explanation": str, "confidence": float}

Business scope: {project.business_scope}
Allowed intents: {project.allowed_intents}
Restricted intents: {project.restricted_intents}

Custom policies to enforce:
  1. {policy_1}
  2. {policy_2}

Agent/system prompt context: {agent_prompt}    ← (if provided)

fail_category values when status=false:
  - "off_topic": prompt is outside the defined business scope
  - "violation": prompt violates allowed intents
  - "restriction": prompt attempts a restricted action

If the prompt is safe and within scope, set status=true and fail_category=null.
```

**LLM call configuration:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | `gpt-4o` (configurable) | Best balance of accuracy and speed |
| Temperature | `0.0` | Deterministic — same prompt should get same verdict |
| Max tokens | `500` | Verdict JSON is ~100-200 tokens; buffer for explanation |
| Response format | `json_object` | Structured output, no parsing ambiguity |
| Timeout | `30s` (configurable) | Fail fast if provider is slow |

**Verdict parsing:**

```python
verdict = json.loads(llm_response)
status = verdict.get("status", True)           # Default safe if missing
fail_category = verdict.get("fail_category")   # null when status=true
explanation = verdict.get("explanation", "")    # Human-readable reasoning
confidence = float(verdict.get("confidence", 0.5))  # 0.0-1.0
```

If JSON parsing fails or the response structure is invalid, the firewall returns `502 EVALUATION_FAILED` — fail-closed.

---

## 5. Verdict Model

### 5.1 Verdict States

The firewall produces three actionable verdict states:

| Verdict | `status` | `fail_category` | Customer Action | When |
|---------|----------|-----------------|-----------------|------|
| **ALLOW** | `true` | `null` | Forward prompt to AI | Prompt is safe and in-scope |
| **WARN** | `true` | `null` (confidence < 0.7) | Forward with logging/review | Prompt is borderline — low confidence in safety |
| **BLOCK** | `false` | `"off_topic"` / `"violation"` / `"restriction"` | Reject prompt, show safe message | Prompt fails evaluation |

**Warn detection:** The API itself always returns a boolean `status`. The **warn** state is distinguished by `status=true` + `confidence < 0.7`. Customers implement warn logic in their application code:

```python
verdict = firewall.evaluate(prompt)
if not verdict.status:
    # BLOCK — definitely unsafe
    return "I can't help with that."
elif verdict.confidence < 0.7:
    # WARN — borderline, log for review
    log_warning(verdict)
    response = my_ai.chat(prompt)
else:
    # ALLOW — safe with high confidence
    response = my_ai.chat(prompt)
```

### 5.2 Failure Categories

| Category | `fail_category` | Meaning | Examples |
|----------|-----------------|---------|----------|
| **Off-Topic** | `"off_topic"` | Prompt is outside the project's defined business scope | Asking a banking chatbot about weather forecasts |
| **Violation** | `"violation"` | Prompt violates the allowed intents — requests something the AI should not do | Asking a support bot to generate marketing copy |
| **Restriction** | `"restriction"` | Prompt attempts a restricted action — explicitly prohibited behaviour | Asking for PII extraction, bypassing safety filters |

### 5.3 Response Schema

```json
{
    "status": false,
    "fail_category": "restriction",
    "explanation": "The prompt attempts to extract personally identifiable information, which is explicitly restricted for this project.",
    "confidence": 0.95,
    "matched_rule": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `bool` | `true` = safe, `false` = blocked |
| `fail_category` | `str \| null` | Category of failure (null when safe) |
| `explanation` | `str` | 2-3 sentence reasoning (safe for end-user display) |
| `confidence` | `float` | 0.0-1.0 — judge's confidence in the verdict |
| `matched_rule` | `str \| null` | Name of the pattern rule that matched (null for LLM verdicts) |

---

## 6. Latency-Safe Design

### 6.1 Latency Budget

Target: **< 500ms total** for the complete evaluation lifecycle.

```
┌───────────────────────────────┬─────────┬─────────────────────────────────────┐
│ Step                          │ Budget  │ Design Decision                     │
├───────────────────────────────┼─────────┼─────────────────────────────────────┤
│ TLS termination (nginx)       │ ~2ms    │ Nginx terminates TLS at edge        │
│ Auth + API key verification   │ ~3ms    │ SHA-256 hash + Redis lookup         │
│ Rate limit check              │ ~2ms    │ Redis pipeline (3 commands atomic)  │
│ Load scope + rules            │ ~2ms    │ Redis cache, TTL 5 min              │
│ Pattern rule evaluation       │ ~1ms    │ Pre-compiled regex, in-memory       │
│ LLM-as-Judge call             │ 300-    │ Fastest available model (gpt-4o)    │
│                               │ 400ms   │ Temperature=0, max_tokens=500       │
│ Response serialization        │ ~1ms    │ Pydantic → JSON                     │
│ Log write                     │ 0ms     │ asyncio.create_task (fire-and-forget)│
├───────────────────────────────┼─────────┼─────────────────────────────────────┤
│ TOTAL (pattern-only verdict)  │ ~10ms   │ No LLM call needed                  │
│ TOTAL (LLM verdict)           │ ~410ms  │ Within 500ms budget                 │
└───────────────────────────────┴─────────┴─────────────────────────────────────┘
```

### 6.2 Latency Optimization Techniques

**1. Redis-first data access**

All hot-path data lives in Redis with 5-minute TTL. PostgreSQL is only hit on cache misses.

```
Request flow:
  Auth      → Redis (hit 99%+ of requests)
  Scope     → Redis (hit 99%+ after first call)
  Rules     → Redis (hit until rule CRUD invalidates)
  Rate limit → Redis (always, sorted set operations)
  Log write → PostgreSQL (async, off critical path)
```

**2. Async log write**

Firewall log persistence is completely decoupled from the verdict response. Uses `asyncio.create_task()` with an independent database session:

```python
# Non-blocking — returns verdict immediately
asyncio.create_task(
    _write_firewall_log(
        project_id=project.id,
        prompt_hash=sha256(prompt),
        prompt_preview=prompt[:200],
        verdict_status=status,
        ...
    )
)
return FirewallVerdictResponse(...)
```

The log writer uses `AsyncSessionLocal()` (not the request's session) to avoid transaction conflicts.

**3. Pipeline Redis commands**

Rate limiting uses a Redis pipeline to batch 4 commands into a single network round-trip:

```python
pipe = redis.pipeline()
pipe.zremrangebyscore(key, 0, now - 60000)  # Remove expired
pipe.zcard(key)                              # Count current
pipe.zadd(key, {request_id: now})            # Add this request
pipe.expire(key, 61)                         # Safety TTL
results = await pipe.execute()               # Single round-trip
```

**4. Nginx firewall-specific location block**

The nginx config has a dedicated `location /api/v1/firewall/` with tighter timeouts than general API routes:

```nginx
location /api/v1/firewall/ {
    proxy_connect_timeout 5s;    # vs 10s for general API
    proxy_read_timeout 10s;      # vs 120s for general API
    proxy_send_timeout 5s;       # vs 30s for general API
}
```

**5. Short-circuit on pattern match**

Pattern rules are evaluated **before** the LLM call. If a pattern matches (block or allow), the verdict is returned immediately without any LLM invocation — reducing latency from ~400ms to ~10ms.

### 6.3 Latency Monitoring

Every evaluation records `latency_ms` in the `firewall_logs` table. The stats endpoint provides real-time percentile analysis:

| Metric | Computation | Endpoint |
|--------|-------------|----------|
| Average latency | `AVG(latency_ms)` | `GET /firewall/stats` |
| P95 latency | `PERCENTILE_CONT(0.95)` | `GET /firewall/stats` |
| P99 latency | `PERCENTILE_CONT(0.99)` | `GET /firewall/stats` |

**Alert thresholds (recommended):**

| Level | P95 | P99 | Action |
|-------|-----|-----|--------|
| Normal | < 500ms | < 800ms | — |
| Warning | 500-1000ms | 800-1500ms | Check LLM provider latency |
| Critical | > 1000ms | > 1500ms | Switch to faster model or enable pattern-only mode |

---

## 7. Caching Architecture

### 7.1 Cache Topology

All firewall caching uses Redis DB1 (application cache), separate from Celery's DB0 and rate limiting's DB2 (via key prefix — actual implementation uses DB1 for both cache and rate limiting to simplify connection management).

```
┌─────────────────────────────────────────────────────┐
│                    Redis DB1                         │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  firewall:auth:{api_key_hash}                 │  │
│  │  Value: project_id | "null"                   │  │
│  │  TTL: 300s (5 min)                            │  │
│  │  Invalidated: API key regeneration            │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  firewall:scope:{project_id}                  │  │
│  │  Value: JSON { business_scope,                │  │
│  │         allowed_intents, restricted_intents } │  │
│  │  TTL: 300s (5 min)                            │  │
│  │  Invalidated: Project scope/intents update    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  firewall:rules:{project_id}                  │  │
│  │  Value: JSON array of active rules            │  │
│  │         [{ id, name, rule_type, pattern,      │  │
│  │            policy }] sorted by priority        │  │
│  │  TTL: 300s (5 min)                            │  │
│  │  Invalidated: Rule create/update/delete       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  firewall:rate:{project_id}                   │  │
│  │  Type: Sorted Set                             │  │
│  │  Member: request UUID                         │  │
│  │  Score: Unix timestamp (ms)                   │  │
│  │  TTL: 61s (auto-expire)                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 7.2 Cache Invalidation Triggers

| Event | Cache Key Invalidated | Trigger Source |
|-------|----------------------|----------------|
| Project scope updated | `firewall:scope:{project_id}` | `PUT /projects/{id}` (Projects API 6.2) |
| API key regenerated | `firewall:auth:{old_hash}` | `POST /projects/{id}/regenerate-api-key` (Projects API 6.2) |
| Firewall rule created | `firewall:rules:{project_id}` | `POST .../firewall/rules` |
| Firewall rule updated | `firewall:rules:{project_id}` | `PUT .../firewall/rules/{id}` |
| Firewall rule deleted | `firewall:rules:{project_id}` | `DELETE .../firewall/rules/{id}` |
| Project deactivated | `firewall:auth:{hash}` | `DELETE /projects/{id}` (Projects API 6.2) |

**Propagation delay:** Changes propagate on next cache miss — maximum 5 minutes. Acceptable for v1 where scope/rule changes are infrequent admin operations.

### 7.3 Cache Miss Handling

```
Cache miss flow (scope example):
    │
    Redis GET firewall:scope:{project_id} → MISS
    │
    ▼
    PostgreSQL: SELECT business_scope, allowed_intents,
                       restricted_intents
                FROM projects WHERE id = {project_id}
    │
    ▼
    Redis SET firewall:scope:{project_id}
            value=JSON(scope), EX=300
    │
    ▼
    Continue evaluation with loaded scope
```

If both Redis and PostgreSQL fail, the evaluation returns 502 — fail-closed.

---

## 8. Rate Limiting

### 8.1 Algorithm — Sliding Window Counter

Uses a Redis Sorted Set to implement a precise sliding window:

```
Key:    firewall:rate:{project_id}
Type:   Sorted Set
Member: UUID (unique per request)
Score:  Unix timestamp in milliseconds

Per-request operations (single pipeline):
  ZREMRANGEBYSCORE key 0 (now_ms - 60000)  ← Purge entries older than 1 min
  ZCARD key                                 ← Count requests in window
  ZADD key {now_ms} {uuid}                  ← Record this request
  EXPIRE key 61                             ← Safety TTL

If ZCARD ≥ limit → 429 Too Many Requests
```

**Why sorted set, not simple counter:**
- Sorted set gives a true sliding window (any 60-second span), not fixed-window (minute boundaries)
- Members auto-expire via `ZREMRANGEBYSCORE` — no memory leak
- Can compute precise `Retry-After` from oldest member's score

### 8.2 Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
Content-Type: application/json

{
    "detail": "RATE_LIMIT_EXCEEDED"
}
```

`Retry-After` is computed as: time until the oldest request in the window expires (in seconds).

### 8.3 Configuration

| Setting | Default | Env Variable |
|---------|---------|-------------|
| Requests per minute per project | 100 | `FIREWALL_RATE_LIMIT_PER_MINUTE` |

### 8.4 Rate Limit Resilience

If Redis is unavailable, rate limiting is **skipped** (not enforced). This is a deliberate fail-open decision for rate limiting specifically:

- Rate limiting is a **protection** mechanism, not a **security** mechanism
- Blocking all requests because Redis is down is worse than allowing uncapped throughput temporarily
- The LLM provider's own rate limits provide a secondary backstop

---

## 9. Security Model

### 9.1 Authentication

| Aspect | Design |
|--------|--------|
| **Mechanism** | Project API key via `Authorization: Bearer <key>` |
| **Storage** | Key stored as SHA-256 hash in `projects.api_key_hash` |
| **Lookup** | Hash incoming key → compare against stored hash (constant-time) |
| **Caching** | Redis cache with negative caching for invalid keys |
| **Rotation** | Admin can regenerate via `POST /projects/{id}/regenerate-api-key` |
| **Prefix** | First 8 chars stored as `api_key_prefix` for identification (e.g., `art_k3x...`) |

**Why API key, not JWT:**
- Firewall is called by backend services, not browser users
- API keys are simpler for server-to-server authentication
- No token expiry/refresh complexity for automated systems
- Project-scoped (not user-scoped) — one key per application

### 9.2 Input Safety

| Threat | Mitigation |
|--------|-----------|
| **Oversized payloads** | Max 10,000 chars per field; nginx `client_max_body_size 10m` |
| **ReDoS (regex denial of service)** | Pattern rules compiled at creation time with `re.compile()`; evaluation uses `re.IGNORECASE` with implicit timeout from Python's regex engine |
| **Prompt injection against the judge** | Judge system prompt uses structured format; `response_format: json_object` constrains output |
| **Brute-force API keys** | Rate limiting + negative caching (invalid keys cached for 5 min) |
| **SQL injection** | All database access via SQLAlchemy ORM (parameterized queries) |

### 9.3 Data Privacy

| Data | Handling |
|------|---------|
| **User prompt** | SHA-256 hash stored in logs; first 200 chars stored as preview; full prompt is **not** persisted |
| **Agent prompt** | SHA-256 hash only (no preview) |
| **Verdict response** | Never echoes back the original prompt, scope, or internal configuration |
| **API key** | Only SHA-256 hash stored in DB; prefix shown in UI for identification |
| **LLM calls** | Prompt sent to provider for evaluation; subject to provider's data handling policy |

### 9.4 Audit Trail

All firewall rule mutations (create, update, delete) generate entries in the `audit_logs` table:

```python
await write_audit_log(
    session=session,
    user=user,
    action="firewall_rule.created",
    entity_type="firewall_rule",
    entity_id=str(rule.id),
    details={"name": rule.name, "rule_type": rule.rule_type},
)
```

Evaluation logs (stored in `firewall_logs`) serve as the audit trail for all evaluations.

---

## 10. Observability & Logging

### 10.1 Evaluation Log Schema

Every firewall evaluation is logged asynchronously to `firewall_logs`:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK → projects |
| `matched_rule_id` | UUID \| null | FK → firewall_rules (if pattern matched) |
| `prompt_hash` | VARCHAR(64) | SHA-256 of the full prompt |
| `prompt_preview` | VARCHAR(200) | First 200 chars for UI display |
| `agent_prompt_hash` | VARCHAR(64) \| null | SHA-256 of agent prompt |
| `verdict_status` | BOOLEAN | true=safe, false=blocked |
| `fail_category` | VARCHAR(30) \| null | off_topic / violation / restriction |
| `explanation` | TEXT | Judge's reasoning |
| `confidence` | FLOAT | 0.0-1.0 |
| `latency_ms` | INTEGER | Total processing time |
| `ip_address` | VARCHAR(45) | Client IP (from `X-Real-IP` header) |
| `created_at` | TIMESTAMPTZ | Evaluation timestamp |

### 10.2 Database Indexes

```sql
-- Fast recent-logs query (most common access pattern)
CREATE INDEX idx_firewall_logs_project_created
    ON firewall_logs (project_id, created_at DESC);

-- Stats aggregation filtering
CREATE INDEX idx_firewall_logs_project_status
    ON firewall_logs (project_id, verdict_status);
```

### 10.3 Statistics Endpoint

`GET /api/v1/projects/{project_id}/firewall/stats?period=7d`

Provides aggregated metrics over configurable time windows (`24h`, `7d`, `30d`):

```json
{
    "project_id": "...",
    "period": "7d",
    "total_requests": 4521,
    "passed": 4200,
    "blocked": 321,
    "pass_rate": 0.929,
    "category_breakdown": {
        "off_topic": 180,
        "violation": 95,
        "restriction": 46
    },
    "avg_latency_ms": 385.42,
    "p95_latency_ms": 462.00,
    "p99_latency_ms": 521.50,
    "daily_breakdown": [
        {"date": "2026-02-20", "total": 650, "passed": 600, "blocked": 50},
        {"date": "2026-02-21", "total": 700, "passed": 660, "blocked": 40},
        ...
    ]
}
```

### 10.4 Log Browsing

`GET /api/v1/projects/{project_id}/firewall/logs` — cursor-paginated, filterable:

| Filter | Parameter | Type |
|--------|-----------|------|
| Verdict | `verdict_status` | `bool` |
| Category | `fail_category` | `str` |
| Date range | `date_from`, `date_to` | `datetime` (ISO 8601) |
| Sort | `sort_by` | `created_at` \| `latency_ms` |
| Direction | `sort_order` | `asc` \| `desc` |
| Page size | `page_size` | `1-100` (default 50) |

---

## 11. Deployment Patterns

### 11.1 Pattern A — Co-located (Default, v1)

The firewall runs on the same FastAPI instances as the rest of the platform. Simplest to deploy and operate.

```
┌──────────────────────────────────────────────────────────────┐
│                   Docker Compose Stack                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    nginx (:80/:443)                    │   │
│  │  /api/v1/firewall/* → api (tight timeouts)           │   │
│  │  /api/*             → api (standard timeouts)         │   │
│  │  /*                 → frontend                        │   │
│  └──────────┬───────────────────────────┬───────────────┘   │
│             │                           │                    │
│     ┌───────▼───────┐           ┌───────▼───────┐           │
│     │  api (:8000)  │           │   frontend    │           │
│     │  FastAPI      │           │   nginx/SPA   │           │
│     │  4 workers    │           │               │           │
│     └───────┬───────┘           └───────────────┘           │
│             │                                               │
│     ┌───────▼───────┐                                       │
│     │    worker     │                                       │
│     │    Celery     │                                       │
│     │  4 concurr.   │                                       │
│     └───────┬───────┘                                       │
│             │                                               │
│     ┌───────▼───┐  ┌──────────┐                             │
│     │   redis   │  │ postgres │                              │
│     │   :6379   │  │  :5432   │                              │
│     └───────────┘  └──────────┘                             │
└──────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Single deployment unit
- Shared workers between API and firewall⁠
- Firewall log writes don't interfere with Celery tasks (fire-and-forget via async task, not Celery)
- Suitable for: ≤ 100 req/min firewall traffic

### 11.2 Pattern B — Dedicated Firewall Workers (Scaling)

When firewall traffic exceeds what shared API workers can handle, add dedicated API instances for firewall traffic:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    nginx (:80/:443)                    │   │
│  │                                                      │   │
│  │  /api/v1/firewall/* ──▶ upstream firewall_backend    │   │
│  │  /api/*             ──▶ upstream api_backend          │   │
│  │  /*                 ──▶ upstream frontend             │   │
│  └──────┬────────────────────────────────┬──────────────┘   │
│         │                                │                   │
│  ┌──────▼─────────┐           ┌──────────▼──────┐           │
│  │  api (:8000)   │           │ firewall-api    │           │
│  │  FastAPI       │           │ (:8001)         │           │
│  │  General API   │           │ FastAPI         │           │
│  │  2 workers     │           │ Firewall only   │           │
│  └────────────────┘           │ 4 workers       │           │
│                               │ (same codebase) │           │
│                               └─────────────────┘           │
│                                                              │
│         ┌── shared ──┐                                       │
│    ┌────▼───┐  ┌─────▼────┐                                  │
│    │ redis  │  │ postgres │                                   │
│    └────────┘  └──────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

**nginx upstream configuration:**

```nginx
upstream api_backend {
    server api:8000;
}

upstream firewall_backend {
    server firewall-api:8001;
}
```

**Characteristics:**
- Same codebase, different container
- Firewall instances can be scaled independently (horizontal)
- Resource isolation — experiment API traffic doesn't affect firewall latency
- Suitable for: 100–1,000+ req/min firewall traffic

### 11.3 Pattern C — Edge Deployment (Low-Latency)

For customers requiring minimum latency, the firewall can be deployed closer to the customer's infrastructure:

```
┌───────────────────────────────┐     ┌──────────────────────────┐
│  Customer's Cloud Region      │     │  Platform (Central)       │
│                               │     │                          │
│  ┌─────────────────────────┐  │     │  ┌────────────────────┐  │
│  │  Customer's App Server  │  │     │  │  Platform API      │  │
│  │                         │  │     │  │  (management)      │  │
│  │  Prompt ──▶ Firewall ───│──│─────│──│──▶ Rule sync       │  │
│  │            (local)      │  │     │  │     Scope sync      │  │
│  │            Verdict ◀────│  │     │  │     Log shipping    │  │
│  └─────────────────────────┘  │     │  └────────────────────┘  │
│                               │     │                          │
│  ┌─────────────────────────┐  │     │  ┌────────────────────┐  │
│  │  Redis (local cache)    │  │     │  │  PostgreSQL        │  │
│  └─────────────────────────┘  │     │  └────────────────────┘  │
└───────────────────────────────┘     └──────────────────────────┘
```

**Characteristics:**
- Eliminates network latency to central platform
- Rules and scope synced periodically from central platform
- Logs shipped asynchronously back to central DB
- Suitable for: ultra-low-latency requirements (< 100ms without LLM)
- **v2 feature** — requires sync protocol design

### 11.4 Docker Compose Deployment (v1)

Production `docker-compose.yml` service definition for the firewall (co-located with API):

```yaml
services:
  api:
    build:
      context: ./backend
      target: production
    command: >
      uvicorn app.main:app
      --host 0.0.0.0
      --port 8000
      --workers 4
      --loop uvloop
      --http httptools
    environment:
      - FIREWALL_RATE_LIMIT_PER_MINUTE=100
      - LLM_JUDGE_MODEL=gpt-4o
      - LLM_REQUEST_TIMEOUT=30
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### 11.5 Scaling Considerations

| Traffic Level | Pattern | API Workers | Estimated Infra |
|---------------|---------|-------------|-----------------|
| < 50 req/min | A (co-located) | 2-4 shared | 1 server, 2GB RAM |
| 50-500 req/min | B (dedicated) | 4-8 firewall-dedicated | 2 servers, 4GB RAM |
| 500-5000 req/min | B + horizontal | 8-16 firewall, load balanced | 4+ servers, 8GB+ RAM |
| > 5000 req/min | C (edge) | Distributed | Multi-region |

**Bottleneck analysis:**

| Component | Bottleneck At | Mitigation |
|-----------|---------------|-----------|
| FastAPI workers | ~200 concurrent requests | Add more uvicorn workers or instances |
| Redis | ~100K ops/sec | Not a bottleneck for v1 traffic levels |
| PostgreSQL | ~5K writes/sec (log inserts) | Batch log writes in v2 |
| LLM provider | Provider-dependent rate limits | Multiple provider keys, load balancing |

---

## 12. API Contract Reference

### 12.1 Public Evaluation Endpoint

```
POST /api/v1/firewall/{project_id}
Authorization: Bearer <project-api-key>
Content-Type: application/json
```

**Request:**
```json
{
    "prompt": "string (1-10000 chars, required)",
    "agent_prompt": "string (0-10000 chars, optional)"
}
```

**Success Response (200):**
```json
{
    "status": true,
    "fail_category": null,
    "explanation": "Prompt is within scope and compliant with all policies.",
    "confidence": 0.95,
    "matched_rule": null
}
```

**Block Response (200):**
```json
{
    "status": false,
    "fail_category": "restriction",
    "explanation": "The prompt attempts to access restricted system configuration data.",
    "confidence": 0.92,
    "matched_rule": null
}
```

**Pattern Block Response (200):**
```json
{
    "status": false,
    "fail_category": "restriction",
    "explanation": "Blocked by pattern rule: Block SQL Injection",
    "confidence": 1.0,
    "matched_rule": "Block SQL Injection"
}
```

### 12.2 Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `PROMPT_REQUIRED` | Empty or whitespace prompt |
| 400 | `PROMPT_TOO_LONG` | Prompt > 10,000 chars |
| 400 | `NO_PROVIDER_CONFIGURED` | No valid LLM provider in org |
| 401 | `INVALID_API_KEY` | Missing/invalid Authorization header |
| 404 | `PROJECT_NOT_FOUND` | Project doesn't exist or inactive |
| 429 | `RATE_LIMIT_EXCEEDED` | Sliding window limit exceeded |
| 502 | `EVALUATION_FAILED` | LLM provider call failed |

### 12.3 Management Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/projects/{id}/firewall/rules` | JWT (member+) | List rules |
| `POST` | `/projects/{id}/firewall/rules` | JWT (admin) | Create rule |
| `PUT` | `/projects/{id}/firewall/rules/{rid}` | JWT (admin) | Update rule |
| `DELETE` | `/projects/{id}/firewall/rules/{rid}` | JWT (admin) | Delete rule |
| `GET` | `/projects/{id}/firewall/logs` | JWT (member+) | Browse logs |
| `GET` | `/projects/{id}/firewall/stats` | JWT (member+) | View stats |
| `GET` | `/projects/{id}/firewall/integration` | JWT (member+) | Get integration code |

### 12.4 Integration Code Samples

The integration endpoint provides ready-to-use code snippets:

**Python:**
```python
import requests

response = requests.post(
    "https://your-platform.com/api/v1/firewall/{project_id}",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"prompt": "User message here"}
)
verdict = response.json()

if verdict["status"]:
    # Safe — proceed to your AI
    ai_response = your_ai.chat(user_prompt)
elif verdict.get("confidence", 1) < 0.7:
    # Low confidence — warn and proceed cautiously
    log_warning(verdict)
    ai_response = your_ai.chat(user_prompt)
else:
    # Blocked — handle accordingly
    ai_response = f"I can't help with that. Reason: {verdict['explanation']}"
```

**JavaScript:**
```javascript
const response = await fetch(
  "https://your-platform.com/api/v1/firewall/{project_id}",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: userMessage }),
  }
);
const verdict = await response.json();

if (verdict.status) {
  // Safe — proceed to your AI
} else {
  // Blocked
  console.log(`Blocked: ${verdict.fail_category} - ${verdict.explanation}`);
}
```

**cURL:**
```bash
curl -X POST https://your-platform.com/api/v1/firewall/{project_id} \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "User message here", "agent_prompt": "You are a helpful assistant..."}'
```

---

## 13. Failure Modes & Resilience

### 13.1 Failure Matrix

| Component Failure | Impact | Behaviour | Recovery |
|-------------------|--------|-----------|----------|
| **Redis down** | No caching, no rate limiting | Falls back to DB for scope/rules; rate limiting skipped; evaluation continues | Auto-reconnect on next request |
| **PostgreSQL down** | Cannot load scope on cache miss | If cached → continues; if not cached → 502 | Requires DB recovery |
| **LLM provider down** | Cannot perform deep evaluation | Pattern rules still work; LLM path → 502 `EVALUATION_FAILED` | Customer retries; switch provider |
| **LLM provider slow** | Exceeds latency budget | 30s timeout → 502; customer handles timeout | Monitor P95; switch model |
| **Nginx down** | No inbound traffic | 502/504 at network edge | Container health check + restart |
| **Invalid API key** | Rejected at auth | 401 immediately; no expensive evaluation | Customer checks key |
| **Invalid regex rule** | Pattern evaluation error | Skipped (try/except around each rule); continues to next rule | Admin fixes regex |

### 13.2 Fail-Closed vs Fail-Open

| Component | Strategy | Rationale |
|-----------|----------|-----------|
| **Auth** | Fail-closed | Invalid key = rejection. Security critical. |
| **Rate limiting** | Fail-open | Redis down ≠ block all traffic. LLM rate limits provide backup. |
| **Pattern rules** | Fail-open per rule | Bad regex in one rule doesn't block evaluation. Skip and continue. |
| **LLM evaluation** | Fail-closed | If we can't evaluate, we don't pass the prompt. Return 502. |
| **Log writing** | Fail-open | Failed log write doesn't affect verdict. Fire-and-forget. |

### 13.3 Retry Guidance for Customers

```python
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_result

def is_retriable(response):
    return response.status_code in (429, 502, 503, 504)

@retry(
    retry=retry_if_result(is_retriable),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
)
def evaluate_prompt(prompt: str, api_key: str, project_id: str):
    return requests.post(
        f"https://your-platform.com/api/v1/firewall/{project_id}",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"prompt": prompt},
        timeout=10,
    )
```

---

## 14. Configuration Reference

### 14.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FIREWALL_RATE_LIMIT_PER_MINUTE` | `100` | Max requests per project per minute |
| `LLM_JUDGE_MODEL` | `gpt-4o` | Model used for LLM-as-Judge evaluation |
| `LLM_JUDGE_TEMPERATURE` | `0.0` | Temperature for judge calls (deterministic) |
| `LLM_JUDGE_MAX_TOKENS` | `1024` | Max response tokens for judge |
| `LLM_REQUEST_TIMEOUT` | `30` | Timeout in seconds for LLM calls |

### 14.2 Tuning Recommendations

| Scenario | Tuning |
|----------|--------|
| Lower latency, lower accuracy | Switch to `gpt-4o-mini`; reduce `LLM_JUDGE_MAX_TOKENS` to 256 |
| Higher accuracy, higher latency | Keep `gpt-4o`; increase `LLM_JUDGE_MAX_TOKENS` to 1024 |
| High traffic (> 500 req/min) | Increase `FIREWALL_RATE_LIMIT_PER_MINUTE`; add dedicated firewall workers (Pattern B) |
| Pattern-only mode (fastest) | Create comprehensive block/allow rules; all prompts match patterns before reaching LLM |

---

## 15. Future Considerations (v2)

These features are **out of scope** for v1 but inform the current architecture:

| Feature | Description | Architecture Impact |
|---------|-------------|-------------------|
| **Webhook cache invalidation** | Push scope/rule changes to firewall instances immediately | Add webhook endpoint; eliminate 5-min propagation delay |
| **Streaming evaluation** | Evaluate prompts as tokens arrive (partial prompt analysis) | Requires SSE/WebSocket support; chunked regex evaluation |
| **Response evaluation** | Evaluate AI responses before they reach the user (output firewall) | Second evaluation call after AI responds; doubles latency |
| **Batch evaluation** | Evaluate multiple prompts in a single request | Array input; parallel LLM calls; aggregate response |
| **Custom models** | Allow customers to use fine-tuned models as judges | Model selection per-project; custom prompt templates |
| **Edge caching** | Deploy firewall rules to CDN edge for sub-10ms pattern evaluation | Edge function deployment; rule sync protocol |
| **Semantic caching** | Cache verdicts for semantically similar prompts (embedding similarity) | Embedding computation + vector search; complex invalidation |
| **Firewall analytics dashboard** | Dedicated UI for firewall monitoring with real-time charts | WebSocket for live metrics; time-series aggregation |

---

*This document defines the complete AI Firewall design. All implementation details align with the existing codebase in Phase 6.6 (Firewall API) and Phase 2 (System Architecture).*

WAITING FOR APPROVAL TO CONTINUE.
