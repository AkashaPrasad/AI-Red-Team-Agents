# Phase 6.4 — Results API Design

> **Status**: COMPLETE  
> **Module**: Results Module  
> **Route file**: `backend/app/api/v1/results.py`  
> **Schema file**: `backend/app/api/schemas/results.py`  
> **Auth**: All endpoints require JWT. Results are accessed through their parent experiment — users can only access results for experiments belonging to projects within their organization.

---

## 1. Endpoints

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 1 | `GET` | `/api/v1/experiments/{experiment_id}/dashboard` | Aggregated results dashboard | JWT (member+) | Pre-computed analytics |
| 2 | `GET` | `/api/v1/experiments/{experiment_id}/logs` | Paginated test case logs | JWT (member+) | Cursor-based pagination |
| 3 | `GET` | `/api/v1/experiments/{experiment_id}/logs/{test_case_id}` | Single test case detail | JWT (member+) | Full conversation + verdict |

---

## 2. Request Schemas

Results endpoints are read-only — no request bodies. All filtering is via query parameters.

---

## 3. Response Schemas

### 3.1 `DashboardResponse` — `GET .../dashboard`

```python
class DashboardResponse(BaseModel):
    experiment_id: UUID
    experiment_name: str
    experiment_type: str
    sub_type: str
    status: str

    # --- Aggregate scores ---
    total_tests: int
    passed: int
    failed: int
    errors: int
    pass_rate: float                          # 0.0–1.0
    error_rate: float                         # 0.0–1.0
    fail_impact: FailImpact

    # --- Breakdowns ---
    severity_breakdown: SeverityBreakdown
    category_breakdown: list[CategoryBreakdownItem]

    # --- AI Insights ---
    insights: ExperimentInsights | None       # Generated once at experiment completion

    # --- Timing ---
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: int | None              # completed_at - started_at
```

### 3.2 `FailImpact` — severity assessment of failures

```python
class FailImpact(BaseModel):
    level: str                # "low" | "medium" | "high" | "critical"
    high_severity_count: int
    medium_severity_count: int
    low_severity_count: int
    summary: str              # e.g. "3 high-severity failures in prompt injection category"
```

### 3.3 `SeverityBreakdown`

```python
class SeverityBreakdown(BaseModel):
    high: int
    medium: int
    low: int
```

### 3.4 `CategoryBreakdownItem`

```python
class CategoryBreakdownItem(BaseModel):
    risk_category: str         # e.g. "prompt_injection", "info_disclosure"
    total: int
    passed: int
    failed: int
    high_severity: int
    medium_severity: int
    low_severity: int
    owasp_mapping: str | None  # e.g. "LLM01"
```

### 3.5 `ExperimentInsights` — AI-generated analysis

```python
class ExperimentInsights(BaseModel):
    summary: str                      # 3–5 sentence overall assessment
    key_findings: list[str]           # Top 3–5 findings
    risk_assessment: str              # "low" | "medium" | "high" | "critical"
    recommendations: list[str]       # Top 3–5 actionable recommendations
    generated_at: datetime
```

### 3.6 `LogEntry` — single test case in list view

```python
class LogEntry(BaseModel):
    id: UUID                          # test_case.id
    sequence_order: int
    prompt_preview: str               # First 200 chars of prompt
    result: str                       # "pass" | "fail" | "error"
    severity: str | None              # "low" | "medium" | "high" (null for pass)
    risk_category: str | None
    owasp_mapping: str | None
    confidence: float | None
    is_representative: bool
    data_strategy: str | None
    latency_ms: int | None
    has_feedback: bool                # Whether current user has submitted feedback
    created_at: datetime
```

### 3.7 `LogList` — cursor-paginated list wrapper

```python
class LogList(BaseModel):
    items: list[LogEntry]
    total: int                        # Total matching records (for display)
    cursor: str | None                # Opaque cursor for next page (null = last page)
    page_size: int
```

### 3.8 `LogDetailResponse` — full test case detail

```python
class LogDetailResponse(BaseModel):
    id: UUID
    experiment_id: UUID
    sequence_order: int

    # --- Prompt / Response ---
    prompt: str                        # Full prompt text
    response: str | None               # Full AI response text
    conversation: list[ConversationTurn] | None  # Multi-turn history

    # --- Generation metadata ---
    risk_category: str | None
    data_strategy: str | None
    attack_converter: str | None
    is_representative: bool
    latency_ms: int | None

    # --- Verdict (from Result) ---
    result: str                        # "pass" | "fail" | "error"
    severity: str | None
    confidence: float | None
    explanation: str | None
    owasp_mapping: str | None

    # --- User's feedback (if any) ---
    my_feedback: FeedbackSnapshot | None

    created_at: datetime
```

### 3.9 `ConversationTurn` — single turn in multi-turn conversation

```python
class ConversationTurn(BaseModel):
    role: str                          # "user" | "assistant" | "system"
    content: str
```

### 3.10 `FeedbackSnapshot` — embedded in LogDetailResponse

```python
class FeedbackSnapshot(BaseModel):
    id: UUID
    vote: str                          # "up" | "down"
    correction: str | None             # "pass" | "low" | "medium" | "high"
    comment: str | None
    created_at: datetime
```

---

## 4. Query Parameters

### `GET /api/v1/experiments/{experiment_id}/logs`

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| `cursor` | str | None | Opaque string | Cursor from previous response for next page |
| `page_size` | int | 50 | 1–100 | Items per page |
| `result` | str | None | `"pass"`, `"fail"`, `"error"` | Filter by verdict |
| `severity` | str | None | `"low"`, `"medium"`, `"high"` | Filter by severity (only applies to failed) |
| `risk_category` | str | None | Max 50 chars | Filter by risk category |
| `data_strategy` | str | None | Max 100 chars | Filter by generation strategy |
| `is_representative` | bool | None | — | `true` = representatives only toggle |
| `search` | str | None | Max 200 chars | Search in prompt text (full-text, `ILIKE %search%`) |
| `sort_by` | str | `"sequence_order"` | `"sequence_order"`, `"created_at"`, `"severity"`, `"result"` | Sort field |
| `sort_order` | str | `"asc"` | `"asc"`, `"desc"` | Sort direction |

**Cursor-based pagination:**
- The `cursor` is an opaque base64-encoded string containing the last record's sort key + id
- When `cursor` is provided, `page_size` records after that cursor position are returned
- `total` is always included for display purposes (computed once via COUNT, cached for the query)
- If `cursor` is `null` in the response, the client has reached the last page

---

## 5. Error Responses

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `GET .../dashboard` | 404 | `EXPERIMENT_NOT_FOUND` | Experiment doesn't exist or user lacks org access |
| `GET .../dashboard` | 400 | `EXPERIMENT_NOT_COMPLETED` | Experiment status is not `"completed"` (dashboard requires computed analytics) |
| `GET .../logs` | 404 | `EXPERIMENT_NOT_FOUND` | Experiment doesn't exist or user lacks org access |
| `GET .../logs` | 400 | `INVALID_CURSOR` | Cursor string is malformed or expired |
| `GET .../logs/{id}` | 404 | `EXPERIMENT_NOT_FOUND` | Experiment doesn't exist or user lacks org access |
| `GET .../logs/{id}` | 404 | `TEST_CASE_NOT_FOUND` | Test case doesn't exist or doesn't belong to this experiment |
| Any | 401 | `UNAUTHORIZED` | Missing/invalid JWT |

---

## 6. Endpoint Behaviour Detail

### 6.1 `GET /api/v1/experiments/{experiment_id}/dashboard`
1. Query `Experiment` by `id`
2. Verify experiment's project belongs to user's org → 404 if not
3. If `status != "completed"` → 400 `EXPERIMENT_NOT_COMPLETED`
   - Dashboard depends on pre-computed `analytics` JSON generated at experiment completion
   - For running experiments, use the `/status` endpoint instead
4. Read `analytics` JSONB from experiment record (pre-computed by worker)
5. Compute `fail_impact`:
   - Count high/medium/low severity failures from analytics
   - Determine `level`:
     - `high_severity >= 5` → `"critical"`
     - `high_severity >= 1` → `"high"`
     - `medium_severity >= 3` → `"medium"`
     - else → `"low"`
   - Generate summary string
6. Build `category_breakdown` from `analytics.category_breakdown`
7. Read `insights` from experiment record (stored as JSONB, generated by worker via single LLM call at completion)
8. Compute `duration_seconds` from `started_at` / `completed_at`
9. Return `DashboardResponse`

### 6.2 `GET /api/v1/experiments/{experiment_id}/logs`
1. Query `Experiment` by `id`
2. Verify experiment's project belongs to user's org → 404 if not
3. Build query: `SELECT test_cases JOIN results ON test_case_id`
4. Apply filters:
   - `result` → filter `results.result`
   - `severity` → filter `results.severity`
   - `risk_category` → filter `test_cases.risk_category`
   - `data_strategy` → filter `test_cases.data_strategy`
   - `is_representative` → filter `test_cases.is_representative`
   - `search` → `ILIKE %search%` on `test_cases.prompt`
5. Apply sort order
6. Apply cursor-based pagination:
   - Decode cursor → extract (sort_value, id)
   - Add WHERE clause: `(sort_column, id) > (sort_value, cursor_id)`
   - LIMIT `page_size + 1` (extra record to detect if more pages exist)
7. Compute `has_feedback`: check if a `Feedback` record exists for `(test_case_id, current_user_id)`
8. Compute `total`: COUNT of matching records (without pagination)
9. Build next `cursor`:
   - If `page_size + 1` records returned → encode last included record's (sort_value, id)
   - If fewer records → `cursor = null` (last page)
10. Truncate `prompt` to first 200 chars → `prompt_preview`
11. Return `LogList`

### 6.3 `GET /api/v1/experiments/{experiment_id}/logs/{test_case_id}`
1. Query `Experiment` by `id`
2. Verify experiment's project belongs to user's org → 404 if not
3. Query `TestCase` by `test_case_id` + verify `experiment_id` matches → 404 if not
4. Join `Result` on `test_case_id` for verdict data
5. Parse `conversation` JSONB into `list[ConversationTurn]` if present
6. Lookup current user's `Feedback` for this test case → `my_feedback`
7. Return `LogDetailResponse`

---

## 7. Performance Design

| Concern | Approach |
|---------|----------|
| **Dashboard speed** | Analytics are pre-computed at experiment completion and stored as JSONB. Dashboard reads one row — sub-50ms response. |
| **Log list performance** | Cursor-based pagination is O(1) per page (no OFFSET). Index on `(experiment_id, sequence_order)` covers the default sort. |
| **Representative sampling** | The `is_representative` flag is set by the worker during experiment execution (~50–100 out of thousands). Filtering by this flag uses the existing index. |
| **Total count caching** | The COUNT query for `total` runs once per filter combination. For subsequent pages with the same filters, the total can be cached in Redis (TTL 30s). |
| **Prompt preview** | Truncation to 200 chars happens at the API layer, not in SQL, to keep the query simple. Full prompt is only loaded in detail view. |
| **Feedback lookup** | `has_feedback` uses a lightweight EXISTS subquery, not a JOIN, to avoid multiplying rows. |

---

## 8. Security & Access Control

| Concern | Rule |
|---------|------|
| **Org scoping** | Results are accessed through experiments. The experiment's project must belong to the user's org. |
| **Role enforcement** | All results endpoints → `member` or `admin`. Read-only, no role restriction beyond membership. |
| **Data exposure** | Full prompts and responses are only exposed in the detail endpoint (`/logs/{id}`), not in the list view (truncated preview only). |
| **No direct test_case access** | Test cases can only be accessed through their experiment — no top-level `/test-cases` endpoint exists. |
| **Audit trail** | Read-only endpoints — no audit log entries generated. |

---
