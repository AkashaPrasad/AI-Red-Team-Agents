# Phase 6.1 — Providers API Design

> **Status**: COMPLETE  
> **Module**: Provider Module  
> **Route file**: `backend/app/api/v1/providers.py`  
> **Schema file**: `backend/app/api/schemas/providers.py`  
> **Auth**: All endpoints require JWT (authenticated user). Org-scoped — users only see providers belonging to their organization.

---

## 1. Endpoints

| # | Method | Path | Summary | Auth | Notes |
|---|--------|------|---------|------|-------|
| 1 | `POST` | `/api/v1/providers` | Create a new model provider | JWT (admin) | Encrypts API key before storage |
| 2 | `GET` | `/api/v1/providers` | List all providers for the user's org | JWT (member+) | Returns masked keys |
| 3 | `GET` | `/api/v1/providers/{provider_id}` | Get a single provider | JWT (member+) | Returns masked key |
| 4 | `PUT` | `/api/v1/providers/{provider_id}` | Update a provider | JWT (admin) | Re-validates if api_key changed |
| 5 | `DELETE` | `/api/v1/providers/{provider_id}` | Delete a provider | JWT (admin) | Fails if linked to experiments |
| 6 | `POST` | `/api/v1/providers/{provider_id}/validate` | Test provider credentials | JWT (admin) | Makes lightweight LLM call |

---

## 2. Request Schemas

### 2.1 `ProviderCreate` — `POST /api/v1/providers`

```python
class ProviderCreate(BaseModel):
    name: str               # 1–100 chars, stripped
    provider_type: str      # Literal["openai", "azure_openai"]
    api_key: str            # 1–500 chars, never logged/returned
    endpoint_url: str | None = None  # Required when provider_type == "azure_openai", max 500 chars, must be valid URL
```

**Validation rules:**
- `name`: Required, 1–100 chars after strip, no leading/trailing whitespace
- `provider_type`: Required, must be one of `"openai"`, `"azure_openai"`
- `api_key`: Required, 1–500 chars, sensitive — never echoed in any response
- `endpoint_url`: Required when `provider_type == "azure_openai"`, must be a valid HTTPS URL, max 500 chars. Ignored/rejected when `provider_type == "openai"`

### 2.2 `ProviderUpdate` — `PUT /api/v1/providers/{provider_id}`

```python
class ProviderUpdate(BaseModel):
    name: str | None = None              # 1–100 chars if provided
    api_key: str | None = None           # 1–500 chars if provided; re-encrypts
    endpoint_url: str | None = None      # Max 500 chars, valid HTTPS URL
```

**Validation rules:**
- All fields optional; at least one must be provided
- Same per-field constraints as `ProviderCreate`
- If `api_key` is provided, the stored `encrypted_api_key` is replaced, and `is_valid` is reset to `false`
- Cannot change `provider_type` after creation (immutable)

---

## 3. Response Schemas

### 3.1 `ProviderResponse` — single provider (returned by GET, POST, PUT)

```python
class ProviderResponse(BaseModel):
    id: UUID
    name: str
    provider_type: str
    endpoint_url: str | None
    is_valid: bool
    api_key_preview: str          # Masked: "sk-...7xQ2" (first 3 + last 4 chars)
    created_by: UserBrief | None  # { id, email, full_name }
    created_at: datetime
    updated_at: datetime
```

**Rules:**
- The `api_key` is **never** returned in any response — only `api_key_preview` (masked)
- `created_by` is `null` if the creator user was deleted (SET NULL)

### 3.2 `ProviderList` — list wrapper (returned by GET /providers)

```python
class ProviderList(BaseModel):
    items: list[ProviderResponse]
    total: int
```

### 3.3 `ProviderValidationResult` — returned by POST /providers/{id}/validate

```python
class ProviderValidationResult(BaseModel):
    is_valid: bool
    message: str          # e.g. "Successfully connected to OpenAI API" or error description
    latency_ms: int | None  # Round-trip time of the validation call
```

### 3.4 `UserBrief` — embedded in ProviderResponse

```python
class UserBrief(BaseModel):
    id: UUID
    email: str
    full_name: str | None
```

---

## 4. Error Responses

All errors follow a standard envelope:

```python
class ErrorResponse(BaseModel):
    detail: str           # Human-readable message
    code: str             # Machine-readable error code
```

| Endpoint | Status | Code | Condition |
|----------|--------|------|-----------|
| `POST /providers` | 400 | `INVALID_PROVIDER_TYPE` | Unsupported provider_type |
| `POST /providers` | 400 | `ENDPOINT_URL_REQUIRED` | Azure provider without endpoint_url |
| `POST /providers` | 400 | `ENDPOINT_URL_NOT_ALLOWED` | OpenAI provider with endpoint_url |
| `POST /providers` | 422 | (Pydantic default) | Schema validation failure |
| `GET /providers/{id}` | 404 | `PROVIDER_NOT_FOUND` | ID doesn't exist in user's org |
| `PUT /providers/{id}` | 400 | `NO_FIELDS_TO_UPDATE` | Empty update payload |
| `PUT /providers/{id}` | 404 | `PROVIDER_NOT_FOUND` | ID doesn't exist in user's org |
| `DELETE /providers/{id}` | 404 | `PROVIDER_NOT_FOUND` | ID doesn't exist in user's org |
| `DELETE /providers/{id}` | 409 | `PROVIDER_HAS_EXPERIMENTS` | Provider is referenced by experiments |
| `POST /providers/{id}/validate` | 404 | `PROVIDER_NOT_FOUND` | ID doesn't exist in user's org |
| `POST /providers/{id}/validate` | 502 | `PROVIDER_UNREACHABLE` | LLM API call failed |
| Any | 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| Any | 403 | `FORBIDDEN` | Member attempting admin-only action |

---

## 5. Endpoint Behaviour Detail

### 5.1 `POST /api/v1/providers`
1. Validate request body (`ProviderCreate`)
2. Cross-field validation: if `provider_type == "azure_openai"`, require `endpoint_url`; if `"openai"`, reject `endpoint_url`
3. Encrypt `api_key` using Fernet → store as `encrypted_api_key`
4. Generate `api_key_preview`: first 3 chars + `...` + last 4 chars
5. Create `ModelProvider` record with `organization_id` from current user, `created_by_id` from current user, `is_valid = false`
6. Return `ProviderResponse` (201 Created)
7. Audit log: `provider.created`

### 5.2 `GET /api/v1/providers`
1. Query all `ModelProvider` records where `organization_id == current_user.organization_id`
2. Order by `created_at DESC`
3. Return `ProviderList`

### 5.3 `GET /api/v1/providers/{provider_id}`
1. Query `ModelProvider` by `id` + `organization_id` (org-scoped)
2. If not found → 404
3. Return `ProviderResponse`

### 5.4 `PUT /api/v1/providers/{provider_id}`
1. Validate at least one field provided
2. Query `ModelProvider` by `id` + `organization_id`
3. If not found → 404
4. Apply changes:
   - If `api_key` provided → re-encrypt, update `encrypted_api_key`, reset `is_valid = false`
   - If `name` provided → update `name`
   - If `endpoint_url` provided → validate it's HTTPS, update `endpoint_url`
5. Return updated `ProviderResponse` (200 OK)
6. Audit log: `provider.updated` (with changed field names, NOT values)

### 5.5 `DELETE /api/v1/providers/{provider_id}`
1. Query `ModelProvider` by `id` + `organization_id`
2. If not found → 404
3. Check for linked experiments → if any exist, return 409 `PROVIDER_HAS_EXPERIMENTS`
4. Delete record
5. Return 204 No Content
6. Audit log: `provider.deleted`

### 5.6 `POST /api/v1/providers/{provider_id}/validate`
1. Query `ModelProvider` by `id` + `organization_id`
2. If not found → 404
3. Decrypt `encrypted_api_key` using Fernet
4. Make lightweight LLM call via LLM Gateway:
   - OpenAI: `POST https://api.openai.com/v1/models` (list models)
   - Azure OpenAI: `GET {endpoint_url}/openai/deployments?api-version=...` (list deployments)
5. If success → update `is_valid = true`, return `ProviderValidationResult(is_valid=true, ...)`
6. If failure → update `is_valid = false`, return `ProviderValidationResult(is_valid=false, message=<error>)`
7. Audit log: `provider.validated`

---

## 6. Security & Access Control

| Concern | Rule |
|---------|------|
| **Org scoping** | All queries filter by `organization_id == current_user.organization_id`. A user can never see/modify providers outside their org. |
| **Role enforcement** | `GET` (list/detail) → `member` or `admin`. `POST`, `PUT`, `DELETE`, `validate` → `admin` only. |
| **API key handling** | Raw `api_key` is encrypted before DB write and never stored in plaintext. Never returned in any response. Only a masked preview is exposed. |
| **Audit trail** | All mutations (create, update, delete, validate) generate an `AuditLog` entry with action, entity_type, entity_id, and the acting user_id. |
| **Rate limiting** | Standard API rate limit (60 req/min per user). Validation endpoint additionally throttled to 10 req/min to prevent LLM cost abuse. |

---
