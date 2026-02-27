# Phase 6.2 — Projects API Design

> **Status**: COMPLETE  
> **Module**: Project Module  
> **Route file**: `backend/app/api/v1/projects.py`  
> **Schema file**: `backend/app/api/schemas/projects.py`  
> **Auth**: All endpoints require JWT (authenticated user). Org-scoped — users only see projects belonging to their organization.

---

## 1. Endpoints

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 1 | `POST` | `/api/v1/projects` | Create a new project | JWT (admin) | Generates API key for firewall |
| 2 | `GET` | `/api/v1/projects` | List all projects for the user's org | JWT (member+) | Summary view, paginated |
| 3 | `GET` | `/api/v1/projects/{project_id}` | Get full project detail | JWT (member+) | Includes scope, intents, stats |
| 4 | `PUT` | `/api/v1/projects/{project_id}` | Update a project | JWT (admin) | Cannot change API key |
| 5 | `DELETE` | `/api/v1/projects/{project_id}` | Delete a project | JWT (admin) | Cascades to experiments, firewall, etc. |
| 6 | `POST` | `/api/v1/projects/{project_id}/analyze-scope` | AI-powered scope analysis | JWT (member+) | Synchronous LLM call |
| 7 | `POST` | `/api/v1/projects/{project_id}/regenerate-api-key` | Regenerate firewall API key | JWT (admin) | Invalidates old key |

---

## 2. Request Schemas

### 2.1 `ProjectCreate` — `POST /api/v1/projects`

```python
class ProjectCreate(BaseModel):
    name: str                          # 1–200 chars, stripped
    description: str | None = None     # 0–255 chars
    business_scope: str                # 1–5000 chars, free-text
    allowed_intents: list[str] = []    # 0–50 items, each 1–200 chars
    restricted_intents: list[str] = [] # 0–50 items, each 1–200 chars
```

**Validation rules:**
- `name`: Required, 1–200 chars after strip
- `description`: Optional, max 255 chars
- `business_scope`: Required, 1–5000 chars — free-text describing what the AI does, who uses it, operating context
- `allowed_intents`: Optional list of strings, max 50 items, each item 1–200 chars, no duplicates
- `restricted_intents`: Optional list of strings, max 50 items, each item 1–200 chars, no duplicates
- Cross-field: an intent **cannot** appear in both `allowed_intents` and `restricted_intents`

### 2.2 `ProjectUpdate` — `PUT /api/v1/projects/{project_id}`

```python
class ProjectUpdate(BaseModel):
    name: str | None = None                          # 1–200 chars if provided
    description: str | None = None                   # 0–255 chars if provided
    business_scope: str | None = None                # 1–5000 chars if provided
    allowed_intents: list[str] | None = None         # 0–50 items if provided
    restricted_intents: list[str] | None = None      # 0–50 items if provided
```

**Validation rules:**
- All fields optional; at least one must be provided
- Same per-field constraints as `ProjectCreate`
- If both `allowed_intents` and `restricted_intents` are provided, cross-field validation applies (no overlap)
- If only one is provided, cross-validation runs against the existing stored value of the other
- Updating scope/intents does **not** automatically re-run scope analysis — the user triggers that separately via `/analyze-scope`

### 2.3 `ScopeAnalysisRequest` — `POST /api/v1/projects/{project_id}/analyze-scope`

```python
class ScopeAnalysisRequest(BaseModel):
    # No body required — uses the project's current business_scope + intents
    pass
```

**Notes:**
- The endpoint reads the project's current `business_scope`, `allowed_intents`, and `restricted_intents` from the database
- Sends them to the configured model provider via LLM Gateway for analysis
- This is a synchronous LLM call (fast, single prompt, typically < 10s)

---

## 3. Response Schemas

### 3.1 `ProjectResponse` — single project (returned by GET detail, POST, PUT)

```python
class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    business_scope: str
    allowed_intents: list[str]
    restricted_intents: list[str]
    analyzed_scope: AnalyzedScope | None
    api_key_prefix: str                  # e.g. "art_k3x"
    is_active: bool
    created_by: UserBrief | None
    experiment_count: int                # count of experiments in this project
    created_at: datetime
    updated_at: datetime
```

### 3.2 `ProjectSummary` — list item (returned by GET list)

```python
class ProjectSummary(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_active: bool
    experiment_count: int
    last_experiment_at: datetime | None  # most recent experiment's created_at
    created_at: datetime
    updated_at: datetime
```

### 3.3 `ProjectList` — paginated list wrapper

```python
class ProjectList(BaseModel):
    items: list[ProjectSummary]
    total: int
    page: int
    page_size: int
```

### 3.4 `AnalyzedScope` — embedded in ProjectResponse

```python
class AnalyzedScope(BaseModel):
    summary: str                         # AI-generated 2–3 sentence summary
    topics: list[str]                    # Deduplicated topic areas
    risk_areas: list[str]                # Identified risk areas
    generated_at: datetime               # When the analysis was performed
```

### 3.5 `ScopeAnalysisResponse` — returned by POST /analyze-scope

```python
class ScopeAnalysisResponse(BaseModel):
    analyzed_scope: AnalyzedScope
    message: str                         # e.g. "Scope analysis completed successfully"
```

### 3.6 `ApiKeyResponse` — returned by POST /regenerate-api-key

```python
class ApiKeyResponse(BaseModel):
    api_key: str                         # Full API key (shown ONCE, never again)
    api_key_prefix: str                  # Stored prefix for identification
    message: str                         # "API key regenerated. Store it securely — it will not be shown again."
```

### 3.7 `UserBrief` — embedded (shared schema from 6.1)

```python
class UserBrief(BaseModel):
    id: UUID
    email: str
    full_name: str | None
```

---

## 4. Query Parameters

### `GET /api/v1/projects`

| Param | Type | Default | Constraints | Description |
|-------|------|---------|-------------|-------------|
| `page` | int | 1 | ≥ 1 | Page number |
| `page_size` | int | 20 | 1–100 | Items per page |
| `search` | str | None | Max 100 chars | Search by name (case-insensitive, `ILIKE %search%`) |
| `is_active` | bool | None | — | Filter by active status |
| `sort_by` | str | `"created_at"` | `"name"`, `"created_at"`, `"updated_at"` | Sort field |
| `sort_order` | str | `"desc"` | `"asc"`, `"desc"` | Sort direction |

---

## 5. Error Responses

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `POST /projects` | 422 | (Pydantic) | Schema validation failure |
| `POST /projects` | 400 | `INTENT_OVERLAP` | Same intent in both allowed and restricted |
| `POST /projects` | 400 | `DUPLICATE_INTENTS` | Duplicate items within allowed or restricted list |
| `GET /projects/{id}` | 404 | `PROJECT_NOT_FOUND` | ID doesn't exist in user's org |
| `PUT /projects/{id}` | 404 | `PROJECT_NOT_FOUND` | ID doesn't exist in user's org |
| `PUT /projects/{id}` | 400 | `NO_FIELDS_TO_UPDATE` | Empty update payload |
| `PUT /projects/{id}` | 400 | `INTENT_OVERLAP` | Same intent in both lists (after merge with existing) |
| `DELETE /projects/{id}` | 404 | `PROJECT_NOT_FOUND` | ID doesn't exist in user's org |
| `POST /projects/{id}/analyze-scope` | 404 | `PROJECT_NOT_FOUND` | ID doesn't exist in user's org |
| `POST /projects/{id}/analyze-scope` | 400 | `NO_PROVIDER_CONFIGURED` | No valid model provider in the org |
| `POST /projects/{id}/analyze-scope` | 502 | `SCOPE_ANALYSIS_FAILED` | LLM call failed |
| `POST /projects/{id}/regenerate-api-key` | 404 | `PROJECT_NOT_FOUND` | ID doesn't exist in user's org |
| Any | 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| Any | 403 | `FORBIDDEN` | Member attempting admin-only action |

---

## 6. Endpoint Behaviour Detail

### 6.1 `POST /api/v1/projects`
1. Validate request body (`ProjectCreate`)
2. Cross-field validation: no overlap between `allowed_intents` and `restricted_intents`; no duplicates within each list
3. Generate firewall API key:
   - Generate UUID v4 raw key
   - Compute prefix: first 7 chars → `api_key_prefix` (e.g. `"art_k3x"`)
   - SHA-256 hash the full key → `api_key_hash`
4. Create `Project` record with `organization_id` from current user, `created_by_id` from current user
5. Return `ApiKeyResponse` with the full raw API key (201 Created)
   - **Critical**: The raw API key is returned ONCE in this response. It is never stored or retrievable again.
6. Audit log: `project.created`

### 6.2 `GET /api/v1/projects`
1. Query `Project` records where `organization_id == current_user.organization_id`
2. Apply filters: `search` (ILIKE on `name`), `is_active`
3. Apply sort: `sort_by` + `sort_order`
4. Compute `experiment_count` and `last_experiment_at` via subquery/aggregation
5. Paginate: `page` + `page_size`
6. Return `ProjectList`

### 6.3 `GET /api/v1/projects/{project_id}`
1. Query `Project` by `id` + `organization_id` (org-scoped)
2. If not found → 404
3. Compute `experiment_count` via relationship count
4. Parse `analyzed_scope` JSONB into `AnalyzedScope` if present
5. Return `ProjectResponse`

### 6.4 `PUT /api/v1/projects/{project_id}`
1. Validate at least one field provided
2. Query `Project` by `id` + `organization_id`
3. If not found → 404
4. If intents are being updated, run cross-field validation:
   - If both lists provided: check for overlaps between them
   - If only one list provided: check for overlaps with the stored version of the other list
5. Apply changes
6. **Note**: Does NOT invalidate `analyzed_scope` — the existing analysis remains until the user explicitly re-runs `/analyze-scope`
7. Return updated `ProjectResponse` (200 OK)
8. Audit log: `project.updated` (with changed field names)

### 6.5 `DELETE /api/v1/projects/{project_id}`
1. Query `Project` by `id` + `organization_id`
2. If not found → 404
3. Delete record — cascades to experiments, firewall rules, firewall logs, test cases, results, feedback (all via `CASCADE` FK)
4. Return 204 No Content
5. Audit log: `project.deleted`

### 6.6 `POST /api/v1/projects/{project_id}/analyze-scope`
1. Query `Project` by `id` + `organization_id`
2. If not found → 404
3. Find a valid (`is_valid == true`) model provider in the user's organization
4. If no valid provider → 400 `NO_PROVIDER_CONFIGURED`
5. Construct scope analysis prompt:
   ```
   [System] You are an AI scope analyst.
   [User]
   Business scope: {project.business_scope}
   Allowed intents: {project.allowed_intents}
   Restricted intents: {project.restricted_intents}

   Analyze and return JSON:
   {
     "summary": "2-3 sentence summary of what this AI does",
     "topics": ["topic1", "topic2", ...],
     "risk_areas": ["risk1", "risk2", ...]
   }
   ```
6. Call LLM via LLM Gateway (synchronous, timeout 30s)
7. Parse LLM JSON response into `AnalyzedScope`, add `generated_at = now()`
8. Store as JSONB in `project.analyzed_scope`
9. Return `ScopeAnalysisResponse` (200 OK)
10. Audit log: `project.scope_analyzed`

### 6.7 `POST /api/v1/projects/{project_id}/regenerate-api-key`
1. Query `Project` by `id` + `organization_id`
2. If not found → 404
3. Generate new API key (same algorithm as creation):
   - UUID v4 → raw key
   - Prefix: first 7 chars → `api_key_prefix`
   - SHA-256 hash → `api_key_hash`
4. Update the project record (old key is immediately invalidated — firewall calls with the old key will fail)
5. Return `ApiKeyResponse` with the new raw API key (200 OK)
6. **Critical**: The raw key is shown ONCE. Old key is permanently invalidated.
7. Audit log: `project.api_key_regenerated`

---

## 7. Security & Access Control

| Concern | Rule |
|---------|------|
| **Org scoping** | All queries filter by `organization_id == current_user.organization_id`. Users cannot access projects outside their org. |
| **Role enforcement** | `GET` (list/detail) → `member` or `admin`. All mutations (`POST`, `PUT`, `DELETE`, analyze-scope, regenerate-key) → `admin` only. |
| **API key security** | Raw API key returned exactly once (on create / regenerate). Stored as SHA-256 hash. Prefix stored separately for display. |
| **Cascade awareness** | Deleting a project cascades to all child entities. The DELETE response documents this via the confirmation model. Frontend should show a confirmation dialog. |
| **Scope analysis cost** | Scope analysis makes an LLM call. Rate limited to 5 req/min per project to prevent cost abuse. |
| **Audit trail** | All mutations generate an `AuditLog` entry. |

---

## 8. API Key Lifecycle

```
CREATE PROJECT                     REGENERATE KEY
     │                                  │
     ▼                                  ▼
Generate UUID v4 raw key          Generate UUID v4 raw key
     │                                  │
     ├── Prefix (first 7 chars)         ├── Prefix (first 7 chars)
     │   → stored in api_key_prefix     │   → overwrites api_key_prefix
     │                                  │
     ├── SHA-256(raw key)               ├── SHA-256(raw key)
     │   → stored in api_key_hash       │   → overwrites api_key_hash
     │                                  │   (old key IMMEDIATELY invalid)
     │                                  │
     └── Raw key returned in response   └── Raw key returned in response
         (SHOWN ONCE, NEVER AGAIN)          (SHOWN ONCE, NEVER AGAIN)
```

**Firewall authentication flow:**
1. External app sends `Authorization: Bearer <raw_api_key>` to firewall endpoint
2. Firewall hashes the incoming key with SHA-256
3. Looks up `Project` by matching `api_key_hash`
4. If match → authenticated, proceed with evaluation

---
