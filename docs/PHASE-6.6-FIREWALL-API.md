# Phase 6.6 — Firewall API Design

> **Status**: COMPLETE  
> **Module**: Firewall Module  
> **Route file**: `backend/app/api/v1/firewall.py`  
> **Schema file**: `backend/app/api/schemas/firewall.py`  
> **Auth**: Mixed — the public evaluation endpoint uses **project API key** auth (not JWT). Management and log endpoints use **JWT** auth.

---

## 1. Endpoints

### 1A. Public Firewall Endpoint (API Key Auth)

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 1 | `POST` | `/api/v1/firewall/{project_id}` | Evaluate a prompt | API Key (Bearer) | Real-time verdict, < 500ms target |

### 1B. Firewall Management Endpoints (JWT Auth)

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 2 | `GET` | `/api/v1/projects/{project_id}/firewall/rules` | List firewall rules | JWT (member+) | |
| 3 | `POST` | `/api/v1/projects/{project_id}/firewall/rules` | Create a firewall rule | JWT (admin) | |
| 4 | `PUT` | `/api/v1/projects/{project_id}/firewall/rules/{rule_id}` | Update a firewall rule | JWT (admin) | |
| 5 | `DELETE` | `/api/v1/projects/{project_id}/firewall/rules/{rule_id}` | Delete a firewall rule | JWT (admin) | |
| 6 | `GET` | `/api/v1/projects/{project_id}/firewall/logs` | List firewall evaluation logs | JWT (member+) | Cursor-paginated |
| 7 | `GET` | `/api/v1/projects/{project_id}/firewall/stats` | Firewall usage statistics | JWT (member+) | Aggregated metrics |
| 8 | `GET` | `/api/v1/projects/{project_id}/firewall/integration` | Get integration details | JWT (member+) | Endpoint URL, code snippets |

---

## 2. Request Schemas

### 2.1 `FirewallEvalRequest` — `POST /api/v1/firewall/{project_id}`

```python
class FirewallEvalRequest(BaseModel):
    prompt: str                        # 1–10,000 chars — the user prompt to evaluate
    agent_prompt: str | None = None    # 0–10,000 chars — optional system/agent prompt for context
```

**Validation rules:**

| Field | Rule |
|-------|------|
| `prompt` | Required, 1–10,000 chars. Must not be empty or whitespace-only. |
| `agent_prompt` | Optional, max 10,000 chars. Provides additional context (e.g. the system prompt of the calling AI) for more accurate evaluation. |

### 2.2 `FirewallRuleCreate` — `POST .../firewall/rules`

```python
class FirewallRuleCreate(BaseModel):
    name: str                          # 1–200 chars, stripped
    rule_type: str                     # Literal["block_pattern", "allow_pattern", "custom_policy"]
    pattern: str | None = None         # 1–2000 chars — regex or keyword, required for pattern types
    policy: str | None = None          # 1–5000 chars — natural language, required for custom_policy
    priority: int = 0                  # 0–1000, lower = evaluated first
    is_active: bool = True
```

**Validation rules:**

| Field | Rule |
|-------|------|
| `name` | Required, 1–200 chars after strip |
| `rule_type` | Required, one of `"block_pattern"`, `"allow_pattern"`, `"custom_policy"` |
| `pattern` | Required when `rule_type` is `"block_pattern"` or `"allow_pattern"`. Must be a valid regex (compiled at validation time). Max 2000 chars. |
| `policy` | Required when `rule_type == "custom_policy"`. Natural-language policy description sent to LLM judge. Max 5000 chars. |
| `priority` | Integer 0–1000. Default 0. Lower numbers are evaluated first. |
| `is_active` | Boolean, default `true`. Inactive rules are skipped during evaluation. |

**Cross-field constraints:**
- `rule_type` in `("block_pattern", "allow_pattern")` → `pattern` required, `policy` must be null
- `rule_type == "custom_policy"` → `policy` required, `pattern` must be null
- `pattern` is test-compiled with `re.compile()` at validation time — invalid regex → 400

### 2.3 `FirewallRuleUpdate` — `PUT .../firewall/rules/{rule_id}`

```python
class FirewallRuleUpdate(BaseModel):
    name: str | None = None
    pattern: str | None = None         # Only if rule_type is pattern-based
    policy: str | None = None          # Only if rule_type is custom_policy
    priority: int | None = None
    is_active: bool | None = None
```

**Validation rules:**
- All fields optional; at least one must be provided
- Same per-field constraints as `FirewallRuleCreate`
- `rule_type` is **immutable** after creation — cannot be changed
- If `pattern` is provided on a `custom_policy` rule → 400 `FIELD_NOT_APPLICABLE`
- If `policy` is provided on a pattern-based rule → 400 `FIELD_NOT_APPLICABLE`

---

## 3. Response Schemas

### 3.1 `FirewallVerdictResponse` — returned by POST /firewall/{project_id}

```python
class FirewallVerdictResponse(BaseModel):
    status: bool                       # true = safe, false = blocked
    fail_category: str | None          # "off_topic" | "violation" | "restriction" | None
    explanation: str                   # Human-readable reasoning (2–3 sentences)
    confidence: float                  # 0.0–1.0
    matched_rule: str | None           # Name of the matched firewall rule, if any
```

**Verdict categories (when `status == false`):**

| Category | Meaning | Typical Severity |
|----------|---------|-----------------|
| `"off_topic"` | Prompt is outside the project's defined scope | Low |
| `"violation"` | Prompt violates allowed intents | Medium |
| `"restriction"` | Prompt attempts a restricted action | High |

**When `status == true`:**
- `fail_category` is `null`
- `explanation` still provided (e.g. "Prompt is within scope and compliant with all policies")

### 3.2 `FirewallRuleResponse` — single rule

```python
class FirewallRuleResponse(BaseModel):
    id: UUID
    name: str
    rule_type: str
    pattern: str | None
    policy: str | None
    priority: int
    is_active: bool
    created_by: UserBrief | None
    created_at: datetime
    updated_at: datetime
```

### 3.3 `FirewallRuleList` — list wrapper

```python
class FirewallRuleList(BaseModel):
    items: list[FirewallRuleResponse]
    total: int
```

### 3.4 `FirewallLogEntry` — single log in list view

```python
class FirewallLogEntry(BaseModel):
    id: UUID
    prompt_preview: str                # First 200 chars of prompt (from prompt_preview column)
    verdict_status: bool               # true = passed, false = blocked
    fail_category: str | None
    confidence: float | None
    matched_rule_name: str | None      # Name of matched rule if any
    latency_ms: int
    ip_address: str | None
    created_at: datetime
```

### 3.5 `FirewallLogList` — cursor-paginated list

```python
class FirewallLogList(BaseModel):
    items: list[FirewallLogEntry]
    total: int
    cursor: str | None
    page_size: int
```

### 3.6 `FirewallStatsResponse` — aggregated statistics

```python
class FirewallStatsResponse(BaseModel):
    project_id: UUID
    period: str                        # "24h" | "7d" | "30d"

    # --- Volume ---
    total_requests: int
    passed: int
    blocked: int
    pass_rate: float                   # 0.0–1.0

    # --- Category breakdown ---
    category_breakdown: dict[str, int] # {"off_topic": 12, "violation": 5, "restriction": 3}

    # --- Performance ---
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float

    # --- Trends ---
    daily_breakdown: list[DailyStats]  # Per-day breakdown within the period
```

### 3.7 `DailyStats`

```python
class DailyStats(BaseModel):
    date: str                          # "2026-02-25"
    total: int
    passed: int
    blocked: int
```

### 3.8 `FirewallIntegrationResponse` — integration details

```python
class FirewallIntegrationResponse(BaseModel):
    endpoint_url: str                  # Full URL: /api/v1/firewall/{project_id}
    api_key_prefix: str                # e.g. "art_k3x" — visible prefix, not the full key
    rate_limit: int                    # Requests per minute
    python_snippet: str                # Ready-to-use Python code example
    javascript_snippet: str            # Ready-to-use JavaScript code example
    curl_snippet: str                  # Ready-to-use cURL example
```

### 3.9 `UserBrief` — shared schema (from 6.1)

```python
class UserBrief(BaseModel):
    id: UUID
    email: str
    full_name: str | None
```

---

## 4. Query Parameters

### `GET .../firewall/logs`

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| `cursor` | str | None | Opaque string | Cursor for next page |
| `page_size` | int | 50 | 1–100 | Items per page |
| `verdict_status` | bool | None | — | Filter by pass (`true`) or block (`false`) |
| `fail_category` | str | None | `"off_topic"`, `"violation"`, `"restriction"` | Filter by fail category |
| `date_from` | datetime | None | ISO 8601 | Start of date range (inclusive) |
| `date_to` | datetime | None | ISO 8601 | End of date range (inclusive) |
| `sort_by` | str | `"created_at"` | `"created_at"`, `"latency_ms"` | Sort field |
| `sort_order` | str | `"desc"` | `"asc"`, `"desc"` | Sort direction |

### `GET .../firewall/stats`

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| `period` | str | `"7d"` | `"24h"`, `"7d"`, `"30d"` | Time period for aggregation |

---

## 5. Error Responses

### Public Endpoint (API Key Auth)

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `POST /firewall/{id}` | 401 | `INVALID_API_KEY` | Missing or invalid `Authorization: Bearer` header |
| `POST /firewall/{id}` | 404 | `PROJECT_NOT_FOUND` | Project doesn't exist or is inactive |
| `POST /firewall/{id}` | 400 | `PROMPT_REQUIRED` | Empty or whitespace-only prompt |
| `POST /firewall/{id}` | 400 | `PROMPT_TOO_LONG` | Prompt exceeds 10,000 chars |
| `POST /firewall/{id}` | 400 | `NO_PROVIDER_CONFIGURED` | No valid model provider in the project's org |
| `POST /firewall/{id}` | 429 | `RATE_LIMIT_EXCEEDED` | Sliding window rate limit exceeded (includes `Retry-After` header) |
| `POST /firewall/{id}` | 502 | `EVALUATION_FAILED` | LLM provider call failed |

### Management Endpoints (JWT Auth)

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `POST .../rules` | 404 | `PROJECT_NOT_FOUND` | Project doesn't exist in user's org |
| `POST .../rules` | 400 | `INVALID_REGEX` | Pattern fails `re.compile()` |
| `POST .../rules` | 400 | `PATTERN_REQUIRED` | Pattern-type rule without `pattern` |
| `POST .../rules` | 400 | `POLICY_REQUIRED` | Custom policy rule without `policy` |
| `POST .../rules` | 400 | `FIELD_NOT_APPLICABLE` | `pattern` on custom_policy or `policy` on pattern rule |
| `PUT .../rules/{id}` | 404 | `RULE_NOT_FOUND` | Rule doesn't exist or doesn't belong to this project |
| `PUT .../rules/{id}` | 400 | `NO_FIELDS_TO_UPDATE` | Empty update payload |
| `PUT .../rules/{id}` | 400 | `FIELD_NOT_APPLICABLE` | Field doesn't apply to this rule_type |
| `DELETE .../rules/{id}` | 404 | `RULE_NOT_FOUND` | Rule doesn't exist or doesn't belong to this project |
| `GET .../logs` | 404 | `PROJECT_NOT_FOUND` | Project doesn't exist in user's org |
| `GET .../logs` | 400 | `INVALID_CURSOR` | Malformed cursor |
| `GET .../stats` | 404 | `PROJECT_NOT_FOUND` | Project doesn't exist in user's org |
| `GET .../integration` | 404 | `PROJECT_NOT_FOUND` | Project doesn't exist in user's org |
| Any JWT | 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| Any JWT | 403 | `FORBIDDEN` | Member attempting admin-only action |

---

## 6. Endpoint Behaviour Detail

### 6.1 `POST /api/v1/firewall/{project_id}` — Public Evaluation

This is the **production-facing endpoint** called by external applications.

1. **Authenticate**: Extract `Authorization: Bearer <api_key>` header
   - SHA-256 hash the incoming key
   - Look up `Project` by matching `api_key_hash`
   - Check Redis cache first → fallback to DB → cache result (TTL 5 min)
   - If no match → 401 `INVALID_API_KEY`
   - If project `is_active == false` → 404 `PROJECT_NOT_FOUND`
2. **Rate limit**: Check Redis sliding window counter for this project
   - Key: `firewall:rate:{project_id}`
   - Window: 1 minute
   - Limit: `settings.firewall_rate_limit_per_minute` (default 100)
   - If exceeded → 429 with `Retry-After` header
3. **Load project scope**: Read from Redis cache (TTL 5 min)
   - Key: `firewall:scope:{project_id}`
   - Cache miss → load `business_scope`, `allowed_intents`, `restricted_intents` from DB → cache
4. **Evaluate firewall rules** (pattern-based, fast):
   - Load active rules for project, ordered by `priority ASC`
   - For each `block_pattern` rule: if `re.search(pattern, prompt)` matches → immediate block verdict
   - For each `allow_pattern` rule: if matches → skip LLM evaluation, return pass
   - Rules are cached in Redis (TTL 5 min, invalidated on rule CRUD)
5. **LLM-as-Judge evaluation** (if no pattern rule matched):
   - Find a valid provider in the project's org
   - Construct judge prompt with project scope + intents + prompt + optional agent_prompt
   - Call LLM via Gateway (timeout from `settings.llm_request_timeout`, default 30s)
   - Parse structured JSON response into verdict
6. **Log evaluation** (async, non-blocking):
   - Compute `prompt_hash = SHA-256(prompt)`
   - Truncate prompt to 200 chars → `prompt_preview`
   - Fire-and-forget: write `FirewallLog` record via Celery task or `asyncio.create_task`
   - Does NOT add latency to verdict response
7. **Return verdict**: `FirewallVerdictResponse`

**Latency budget:**

| Step | Budget |
|------|--------|
| Auth + rate limit (Redis) | ~5ms |
| Load scope (Redis cache) | ~2ms |
| Pattern rule evaluation | ~1ms |
| LLM call | ~300–400ms |
| Log write (async) | 0ms (non-blocking) |
| **Total target** | **< 500ms** |

### 6.2 `GET .../firewall/rules`
1. Verify `project_id` belongs to user's org → 404 if not
2. Query `FirewallRule` records for this project, ordered by `priority ASC`
3. Return `FirewallRuleList`

### 6.3 `POST .../firewall/rules`
1. Verify `project_id` belongs to user's org → 404 if not
2. Validate request body (`FirewallRuleCreate`)
3. Cross-field validation: pattern vs policy for rule_type
4. If pattern-type: test-compile regex with `re.compile(pattern)` → 400 `INVALID_REGEX` on failure
5. Create `FirewallRule` record with `created_by_id` from current user
6. **Invalidate rule cache**: delete Redis key `firewall:rules:{project_id}`
7. Return `FirewallRuleResponse` (201 Created)
8. Audit log: `firewall_rule.created`

### 6.4 `PUT .../firewall/rules/{rule_id}`
1. Verify `project_id` belongs to user's org → 404 if not
2. Query `FirewallRule` by `rule_id` + `project_id` → 404 if not found
3. Validate at least one field provided
4. Cross-field: ensure provided fields are applicable to the rule's `rule_type`
5. If `pattern` provided: test-compile regex
6. Apply changes
7. **Invalidate rule cache**: delete Redis key `firewall:rules:{project_id}`
8. Return updated `FirewallRuleResponse` (200 OK)
9. Audit log: `firewall_rule.updated`

### 6.5 `DELETE .../firewall/rules/{rule_id}`
1. Verify `project_id` belongs to user's org → 404 if not
2. Query `FirewallRule` by `rule_id` + `project_id` → 404 if not found
3. Delete record (linked `FirewallLog.matched_rule_id` set to NULL via FK)
4. **Invalidate rule cache**: delete Redis key `firewall:rules:{project_id}`
5. Return 204 No Content
6. Audit log: `firewall_rule.deleted`

### 6.6 `GET .../firewall/logs`
1. Verify `project_id` belongs to user's org → 404 if not
2. Build query on `FirewallLog` for this project
3. Apply filters: `verdict_status`, `fail_category`, `date_from`, `date_to`
4. Apply sort + cursor-based pagination (same mechanism as Results API 6.4)
5. Join `FirewallRule` name for `matched_rule_name` where applicable
6. Return `FirewallLogList`

### 6.7 `GET .../firewall/stats`
1. Verify `project_id` belongs to user's org → 404 if not
2. Determine date range from `period` param:
   - `"24h"` → last 24 hours
   - `"7d"` → last 7 days
   - `"30d"` → last 30 days
3. Run aggregate queries on `FirewallLog`:
   - `total_requests`, `passed`, `blocked`, `pass_rate`
   - `category_breakdown`: GROUP BY `fail_category`
   - Latency percentiles: `avg`, `p95`, `p99` via `PERCENTILE_CONT` PostgreSQL function
   - `daily_breakdown`: GROUP BY `DATE(created_at)`
4. Return `FirewallStatsResponse`

### 6.8 `GET .../firewall/integration`
1. Verify `project_id` belongs to user's org → 404 if not
2. Build integration response:
   - `endpoint_url`: construct from `settings.api_v1_prefix` + `/firewall/{project_id}`
   - `api_key_prefix`: from project record
   - `rate_limit`: from `settings.firewall_rate_limit_per_minute`
   - Generate code snippets:

**Python snippet:**
```python
import requests

response = requests.post(
    "{endpoint_url}",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"prompt": "User message here"}
)
verdict = response.json()
if verdict["status"]:
    # Safe — proceed to your AI
    pass
else:
    # Blocked — handle accordingly
    print(f"Blocked: {verdict['fail_category']} - {verdict['explanation']}")
```

**JavaScript snippet:**
```javascript
const response = await fetch("{endpoint_url}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ prompt: "User message here" })
});
const verdict = await response.json();
if (verdict.status) {
  // Safe — proceed to your AI
} else {
  // Blocked — handle accordingly
  console.log(`Blocked: ${verdict.fail_category} - ${verdict.explanation}`);
}
```

**cURL snippet:**
```bash
curl -X POST {endpoint_url} \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "User message here"}'
```

3. Return `FirewallIntegrationResponse`

---

## 7. Evaluation Pipeline

```
Incoming Request
    │
    ▼
┌─────────────────────┐
│  1. API Key Auth     │──── 401 Invalid
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  2. Rate Limit Check │──── 429 Too Many Requests
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  3. Load Scope       │  (Redis cache, TTL 5 min)
│     + Rules          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  4. Pattern Rules    │────▶│ Block/Allow match │──── Return verdict
│     (regex fast-path)│     └──────────────────┘     (skip LLM)
└──────────┬──────────┘
           │ (no match)
           ▼
┌─────────────────────┐
│  5. LLM-as-Judge     │──── 502 if LLM fails
│     Evaluation       │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  6. Async Log Write  │  (fire-and-forget)
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  7. Return Verdict   │
└─────────────────────┘
```

---

## 8. Caching Strategy

| Redis Key | Content | TTL | Invalidation |
|-----------|---------|-----|--------------|
| `firewall:auth:{api_key_hash}` | Project ID or `null` | 5 min | On API key regeneration |
| `firewall:scope:{project_id}` | `{scope, allowed, restricted}` JSON | 5 min | On project update (scope/intents) |
| `firewall:rules:{project_id}` | Serialized active rules list | 5 min | On rule create/update/delete |
| `firewall:rate:{project_id}` | Sliding window counter | 1 min | Auto-expires |

**Cache invalidation triggers:**
- Project scope/intents updated (6.2 PUT) → delete `firewall:scope:{project_id}`
- Project API key regenerated (6.2 regenerate) → delete `firewall:auth:{old_hash}`
- Firewall rule CRUD (6.6 rules) → delete `firewall:rules:{project_id}`

---

## 9. Security & Access Control

### Public Endpoint

| Concern | Rule |
|---------|------|
| **Authentication** | Project API key via `Authorization: Bearer`. **Not** user JWT. Hashed with SHA-256 and compared against stored hash. |
| **Rate limiting** | Redis sliding window, per-project. Default 100 req/min. 429 with `Retry-After` header. |
| **Input validation** | Max 10,000 chars for prompt and agent_prompt. Reject malformed JSON. |
| **No data leakage** | Verdict response never echoes back the original prompt, project scope, or internal configuration. |
| **TLS** | Enforced at load balancer (nginx). All traffic encrypted in transit. |
| **Prompt privacy** | Only SHA-256 hash and 200-char preview stored in logs. Full prompt not persisted. |
| **Error opacity** | Internal errors return generic 502 — no stack traces, no provider details exposed. |

### Management Endpoints

| Concern | Rule |
|---------|------|
| **Org scoping** | All queries filter by `organization_id` through the parent project. |
| **Role enforcement** | `GET` (rules, logs, stats, integration) → `member+`. `POST`, `PUT`, `DELETE` (rules) → `admin` only. |
| **Regex safety** | Pattern rules are compiled with `re.compile()` at validation time. At evaluation time, a timeout is enforced (`re.search` with max 100ms) to prevent ReDoS. |
| **Audit trail** | All rule mutations generate `AuditLog` entries. |

---

## 10. Rate Limiting Detail

```
Redis Sliding Window Implementation:

Key:    firewall:rate:{project_id}
Type:   Sorted Set
Member: Unique request ID (UUID)
Score:  Unix timestamp (ms)

On each request:
  1. ZREMRANGEBYSCORE key 0 (now - 60000)    ← Remove entries older than 1 min
  2. ZCARD key                                ← Count current entries
  3. If count >= limit → 429
  4. ZADD key now request_id                  ← Add current request
  5. EXPIRE key 61                            ← Safety TTL

Retry-After header:
  Time until the oldest entry in the window expires (seconds)
```

---
