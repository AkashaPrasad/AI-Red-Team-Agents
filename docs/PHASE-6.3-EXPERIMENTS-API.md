# Phase 6.3 — Experiments API Design

> **Status**: COMPLETE  
> **Module**: Experiment Module  
> **Route file**: `backend/app/api/v1/experiments.py`  
> **Schema file**: `backend/app/api/schemas/experiments.py`  
> **Auth**: All endpoints require JWT. Experiments are nested under projects — users can only access experiments belonging to projects within their organization.

---

## 1. Endpoints

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 1 | `POST` | `/api/v1/projects/{project_id}/experiments` | Create and launch an experiment | JWT (member+) | Dispatches Celery task |
| 2 | `GET` | `/api/v1/projects/{project_id}/experiments` | List experiments for a project | JWT (member+) | Paginated, filterable |
| 3 | `GET` | `/api/v1/experiments/{experiment_id}` | Get experiment detail | JWT (member+) | Includes config + status |
| 4 | `GET` | `/api/v1/experiments/{experiment_id}/status` | Get experiment status + progress | JWT (member+) | Lightweight, used for polling |
| 5 | `POST` | `/api/v1/experiments/{experiment_id}/cancel` | Cancel a running experiment | JWT (member+) | Sets Redis cancellation flag |

---

## 2. Request Schemas

### 2.1 `ExperimentCreate` — `POST /api/v1/projects/{project_id}/experiments`

```python
class ExperimentCreate(BaseModel):
    name: str                          # 1–200 chars, stripped
    description: str | None = None     # Max 2000 chars
    provider_id: UUID                  # Must reference a valid provider in the user's org
    experiment_type: str               # Literal["adversarial", "behavioural"]
    sub_type: str                      # Depends on experiment_type (see validation below)
    turn_mode: str                     # Literal["single_turn", "multi_turn"]
    testing_level: str                 # Literal["basic", "moderate", "aggressive"]
    language: str = "en"               # ISO 639-1 code, 2–10 chars
    target_config: TargetConfig        # Nested object — target AI connection details
```

### 2.2 `TargetConfig` — nested in ExperimentCreate

```python
class TargetConfig(BaseModel):
    endpoint_url: str                  # Required, valid HTTPS URL, max 500 chars
    method: str = "POST"               # Literal["POST", "PUT"]
    headers: dict[str, str] = {}       # 0–20 key-value pairs, each key max 100 chars, each value max 500 chars
    payload_template: str              # Required, 1–2000 chars, must contain {{prompt}} placeholder
    auth_type: str | None = None       # Literal["bearer", "api_key", "basic"] | None
    auth_value: str | None = None      # Token/key/base64 credential, max 500 chars, required if auth_type set
    timeout_seconds: int = 30          # 5–120
    # Multi-turn specific (required when turn_mode == "multi_turn")
    thread_endpoint_url: str | None = None   # URL to initialize a conversation thread
    thread_id_path: str | None = None        # JSONPath to extract thread_id from init response
```

**Validation rules:**

| Field | Rule |
|-------|------|
| `name` | Required, 1–200 chars after strip |
| `description` | Optional, max 2000 chars |
| `provider_id` | Must exist in user's org, must have `is_valid == true` |
| `experiment_type` | Required, one of `"adversarial"`, `"behavioural"` |
| `sub_type` | Required, must be valid for the chosen `experiment_type` (see table below) |
| `turn_mode` | Required, one of `"single_turn"`, `"multi_turn"` |
| `testing_level` | Required, one of `"basic"`, `"moderate"`, `"aggressive"` |
| `language` | 2–10 chars, defaults to `"en"` |
| `endpoint_url` | Required, valid HTTPS URL |
| `payload_template` | Must contain the literal `{{prompt}}` placeholder |
| `auth_type` + `auth_value` | If `auth_type` is set, `auth_value` is required |
| `timeout_seconds` | 5–120 |
| `thread_endpoint_url` | Required when `turn_mode == "multi_turn"` |
| `thread_id_path` | Required when `turn_mode == "multi_turn"` |

### 2.3 Valid `sub_type` values per `experiment_type`

| `experiment_type` | Valid `sub_type` values | Description |
|-------------------|------------------------|-------------|
| `adversarial` | `"owasp_llm_top10"` | OWASP LLM Top 10 attack categories |
| `adversarial` | `"owasp_agentic"` | OWASP Agentic AI threat scenarios |
| `adversarial` | `"adaptive"` | Adaptive multi-turn escalation attacks |
| `behavioural` | `"user_interaction"` | Happy path, edge cases, error handling |
| `behavioural` | `"functional"` | Core functionality, integrations |
| `behavioural` | `"scope_validation"` | Policy compliance, scope boundary testing |

**Cross-field constraints:**
- `sub_type == "adaptive"` requires `turn_mode == "multi_turn"` (adaptive tests are inherently multi-turn)
- If `turn_mode == "multi_turn"`, `thread_endpoint_url` and `thread_id_path` are required

---

## 3. Response Schemas

### 3.1 `ExperimentResponse` — full detail (returned by GET detail, POST)

```python
class ExperimentResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str | None
    experiment_type: str
    sub_type: str
    turn_mode: str
    testing_level: str
    language: str
    target_config: TargetConfigResponse    # Sanitized — auth_value masked
    status: str                            # "pending" | "running" | "completed" | "failed" | "cancelled"
    progress: ExperimentProgress
    analytics: ExperimentAnalytics | None  # Only present when status == "completed"
    provider: ProviderBrief
    created_by: UserBrief | None
    error_message: str | None              # Only present when status == "failed"
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
```

### 3.2 `TargetConfigResponse` — sanitized target config

```python
class TargetConfigResponse(BaseModel):
    endpoint_url: str
    method: str
    headers: dict[str, str]                # Header values masked: "Bear...xxxx"
    payload_template: str
    auth_type: str | None
    auth_value_preview: str | None         # Masked: "sk-...7xQ2" (never full value)
    timeout_seconds: int
    thread_endpoint_url: str | None
    thread_id_path: str | None
```

### 3.3 `ExperimentProgress` — embedded progress info

```python
class ExperimentProgress(BaseModel):
    total: int | None          # Total planned test cases (null if not yet calculated)
    completed: int             # Test cases completed so far
    percentage: float | None   # 0.0–100.0 (null if total unknown)
```

### 3.4 `ExperimentAnalytics` — embedded analytics summary

```python
class ExperimentAnalytics(BaseModel):
    total_tests: int
    passed: int
    failed: int
    errors: int
    pass_rate: float               # 0.0–1.0
    severity_breakdown: dict[str, int]   # {"high": 3, "medium": 5, "low": 4}
    category_breakdown: dict[str, int]   # {"jailbreak": 5, "prompt_injection": 4}
```

### 3.5 `ExperimentSummary` — list item (returned by GET list)

```python
class ExperimentSummary(BaseModel):
    id: UUID
    name: str
    experiment_type: str
    sub_type: str
    turn_mode: str
    testing_level: str
    status: str
    progress: ExperimentProgress
    pass_rate: float | None            # From analytics, null if not completed
    created_by: UserBrief | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
```

### 3.6 `ExperimentList` — paginated list wrapper

```python
class ExperimentList(BaseModel):
    items: list[ExperimentSummary]
    total: int
    page: int
    page_size: int
```

### 3.7 `ExperimentStatusResponse` — lightweight polling response

```python
class ExperimentStatusResponse(BaseModel):
    id: UUID
    status: str
    progress: ExperimentProgress
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
```

### 3.8 `ProviderBrief` — embedded in ExperimentResponse

```python
class ProviderBrief(BaseModel):
    id: UUID
    name: str
    provider_type: str
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

### `GET /api/v1/projects/{project_id}/experiments`

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| `page` | int | 1 | ≥ 1 | Page number |
| `page_size` | int | 20 | 1–100 | Items per page |
| `status` | str | None | `"pending"`, `"running"`, `"completed"`, `"failed"`, `"cancelled"` | Filter by status |
| `experiment_type` | str | None | `"adversarial"`, `"behavioural"` | Filter by type |
| `sort_by` | str | `"created_at"` | `"name"`, `"created_at"`, `"status"` | Sort field |
| `sort_order` | str | `"desc"` | `"asc"`, `"desc"` | Sort direction |

---

## 5. Error Responses

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `POST .../experiments` | 404 | `PROJECT_NOT_FOUND` | Project ID doesn't exist in user's org |
| `POST .../experiments` | 400 | `PROVIDER_NOT_FOUND` | `provider_id` doesn't exist in user's org |
| `POST .../experiments` | 400 | `PROVIDER_NOT_VALIDATED` | Provider exists but `is_valid == false` |
| `POST .../experiments` | 400 | `INVALID_SUB_TYPE` | `sub_type` not valid for chosen `experiment_type` |
| `POST .../experiments` | 400 | `ADAPTIVE_REQUIRES_MULTI_TURN` | `sub_type == "adaptive"` but `turn_mode != "multi_turn"` |
| `POST .../experiments` | 400 | `MULTI_TURN_CONFIG_REQUIRED` | Multi-turn mode but missing `thread_endpoint_url` or `thread_id_path` |
| `POST .../experiments` | 400 | `MISSING_PROMPT_PLACEHOLDER` | `payload_template` doesn't contain `{{prompt}}` |
| `POST .../experiments` | 400 | `AUTH_VALUE_REQUIRED` | `auth_type` set but `auth_value` missing |
| `POST .../experiments` | 422 | (Pydantic) | Schema validation failure |
| `GET /experiments/{id}` | 404 | `EXPERIMENT_NOT_FOUND` | ID doesn't exist or user lacks org access |
| `GET /experiments/{id}/status` | 404 | `EXPERIMENT_NOT_FOUND` | ID doesn't exist or user lacks org access |
| `POST /experiments/{id}/cancel` | 404 | `EXPERIMENT_NOT_FOUND` | ID doesn't exist or user lacks org access |
| `POST /experiments/{id}/cancel` | 409 | `EXPERIMENT_NOT_CANCELLABLE` | Status is not `"pending"` or `"running"` |
| Any | 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| Any | 403 | `FORBIDDEN` | User lacks access to the project's org |

---

## 6. Endpoint Behaviour Detail

### 6.1 `POST /api/v1/projects/{project_id}/experiments`
1. Verify `project_id` belongs to user's org → 404 if not
2. Validate request body (`ExperimentCreate`)
3. Cross-field validation:
   - `sub_type` valid for `experiment_type`
   - `adaptive` requires `multi_turn`
   - `multi_turn` requires `thread_endpoint_url` + `thread_id_path`
   - `payload_template` contains `{{prompt}}`
   - `auth_type` set → `auth_value` required
4. Verify `provider_id`:
   - Exists in user's org → 400 `PROVIDER_NOT_FOUND` if not
   - Has `is_valid == true` → 400 `PROVIDER_NOT_VALIDATED` if not
5. Compute `progress_total` based on `testing_level`:
   - `"basic"` → 500
   - `"moderate"` → 1200
   - `"aggressive"` → 2000
6. Create `Experiment` record:
   - `status = "pending"`, `progress_completed = 0`
   - `target_config` stored as JSONB (auth_value encrypted before storage via Fernet)
   - `created_by_id` from current user
7. Dispatch Celery task: `experiment_task.delay(experiment_id=experiment.id)`
8. Store `celery_task_id` on the experiment record
9. Return `ExperimentResponse` (201 Created)
10. Audit log: `experiment.created`

### 6.2 `GET /api/v1/projects/{project_id}/experiments`
1. Verify `project_id` belongs to user's org → 404 if not
2. Query `Experiment` records where `project_id` matches
3. Apply filters: `status`, `experiment_type`
4. Apply sort: `sort_by` + `sort_order`
5. For each experiment, compute `progress.percentage` = `completed / total * 100` (or null)
6. Extract `pass_rate` from `analytics` JSONB if status == completed
7. Paginate: `page` + `page_size`
8. Return `ExperimentList`

### 6.3 `GET /api/v1/experiments/{experiment_id}`
1. Query `Experiment` by `id`
2. Verify the experiment's project belongs to user's org → 404 if not
3. Sanitize `target_config`: mask `auth_value`, mask sensitive header values
4. Parse `analytics` JSONB into `ExperimentAnalytics` if present
5. Read progress from Redis if status == `"running"` (more current than DB); fall back to DB values
6. Return `ExperimentResponse`

### 6.4 `GET /api/v1/experiments/{experiment_id}/status`
1. Query `Experiment` by `id` (select only status/progress fields — lightweight)
2. Verify the experiment's project belongs to user's org → 404 if not
3. If status == `"running"`, read `progress_completed` from Redis (real-time) rather than DB
4. Compute `percentage`
5. Return `ExperimentStatusResponse`

**Polling contract:**
- Frontend polls this endpoint every 5 seconds while `status == "running"`
- Stops polling when status changes to `"completed"`, `"failed"`, or `"cancelled"`
- Response is intentionally minimal (< 200 bytes) to minimize overhead

### 6.5 `POST /api/v1/experiments/{experiment_id}/cancel`
1. Query `Experiment` by `id`
2. Verify the experiment's project belongs to user's org → 404 if not
3. Check status:
   - If `"pending"` → update status to `"cancelled"` directly in DB, revoke Celery task
   - If `"running"` → set cancellation flag in Redis (`experiment:{id}:cancel = true`)
     - Worker checks this flag between batches and stops gracefully
     - Worker updates status to `"cancelled"` + sets `completed_at`
   - If any other status → 409 `EXPERIMENT_NOT_CANCELLABLE`
4. Return `ExperimentStatusResponse` with `status = "cancelled"` (200 OK)
5. Audit log: `experiment.cancelled`

---

## 7. Testing Level → Test Count Mapping

| Testing Level | Approximate Test Count | Estimated Duration | Use Case |
|---------------|----------------------|-------------------|----------|
| `basic` | ~500 | 5–15 min | Quick validation, CI-like runs |
| `moderate` | ~1,200 | 15–30 min | Standard testing for pre-release |
| `aggressive` | ~2,000+ | 30–60 min | Comprehensive audit, compliance |

These counts are stored as `progress_total` on the experiment and are approximate targets. The actual count may vary slightly based on the attack strategies selected.

---

## 8. Status State Machine

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
               ▼           ▼           │
        ┌──────────┐  ┌─────────┐     │
        │ cancelled │  │ running │     │
        └──────────┘  └────┬────┘     │
                           │          │
               ┌───────────┼──────────┘
               │           │
               ▼           ▼
        ┌──────────┐  ┌──────────┐
        │ cancelled │  │completed │
        └──────────┘  └──────────┘
               │
               │
               ▼
        ┌──────────┐
        │  failed  │
        └──────────┘
```

**Valid transitions:**
| From | To | Trigger |
|------|----|---------|
| `pending` | `running` | Celery worker picks up task |
| `pending` | `cancelled` | User cancels before worker starts |
| `running` | `completed` | Worker finishes all test cases |
| `running` | `failed` | Worker encounters unrecoverable error |
| `running` | `cancelled` | User cancels, worker detects flag |

**Invalid transitions** (enforced server-side):
- `completed` → anything (terminal)
- `failed` → anything (terminal)
- `cancelled` → anything (terminal)

---

## 9. Real-Time Progress Tracking (Redis)

While an experiment is `running`, the Celery worker writes progress to Redis for low-latency polling:

| Redis Key | Type | Value | TTL |
|-----------|------|-------|-----|
| `experiment:{id}:progress` | STRING | `"{completed}/{total}"` (e.g. `"340/500"`) | 1 hour |
| `experiment:{id}:cancel` | STRING | `"true"` | 1 hour |
| `experiment:{id}:status` | STRING | `"running"` | 1 hour |

- The `/status` endpoint reads from Redis first (real-time), falls back to DB
- On experiment completion/failure/cancellation, the worker writes final state to DB and deletes Redis keys
- TTL of 1 hour is a safety net — keys are explicitly deleted on completion

---

## 10. Security & Access Control

| Concern | Rule |
|---------|------|
| **Org scoping** | Experiments are accessed through their parent project. The project must belong to the current user's org. |
| **Role enforcement** | All experiment endpoints → `member` or `admin`. No admin-only restrictions — any org member can create/view/cancel experiments. |
| **Target config secrets** | `auth_value` in `target_config` is Fernet-encrypted before JSONB storage. Masked in all API responses. |
| **Header masking** | Sensitive headers (Authorization, X-Api-Key, etc.) are masked in responses: `"Bear...xxxx"` |
| **Cancellation safety** | Cancel uses Redis flag, not direct task termination. Worker stops gracefully between batches. |
| **Rate limiting** | Experiment creation limited to 5 req/min per user (prevents mass launch). |
| **Audit trail** | Create and cancel actions generate `AuditLog` entries. |

---
