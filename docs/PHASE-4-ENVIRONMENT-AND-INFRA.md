# PHASE 4 — Environment & Infrastructure

---

## Files Created

| File | Purpose |
|---|---|
| `backend/requirements.txt` | Pinned production Python dependencies |
| `backend/requirements-dev.txt` | Dev/test dependencies (extends production) |
| `backend/pyproject.toml` | Project metadata, ruff, mypy, pytest config |
| `backend/alembic.ini` | Alembic migration configuration |
| `backend/Dockerfile` | Multi-stage: base → development \| production |
| `frontend/Dockerfile` | Multi-stage: deps → development \| build → production |
| `infra/env/.env.example` | Fully documented env template with all variables |
| `infra/env/.env.development` | Dev defaults (non-secret values only) |
| `infra/env/.env.production` | Production template (secrets must be injected) |
| `infra/docker/docker-compose.yml` | Full production stack (postgres, redis, api, worker, frontend, nginx) |
| `infra/docker/docker-compose.dev.yml` | Dev overrides (hot reload, volume mounts, no nginx) |
| `infra/docker/nginx/nginx.conf` | Nginx main config (gzip, security headers, performance) |
| `infra/docker/nginx/default.conf` | Server block (API proxy, firewall proxy, SPA fallback) |
| `infra/docker/postgres/init.sql` | DB extensions (uuid-ossp, pg_trgm) |
| `scripts/setup.sh` | One-command dev setup (Linux/macOS) |
| `scripts/setup.ps1` | One-command dev setup (Windows) |
| `.gitignore` | Monorepo-wide git ignore rules |
| `.dockerignore` | Docker build context exclusions |

---

## 1. Python Dependencies Overview

### Production Stack

| Category | Packages | Purpose |
|---|---|---|
| **Web Framework** | `fastapi`, `uvicorn[standard]`, `python-multipart` | HTTP server, async ASGI, file uploads |
| **Database** | `sqlalchemy[asyncio]`, `asyncpg`, `alembic` | Async ORM, PostgreSQL driver, migrations |
| **Cache/Broker** | `redis[hiredis]` | Redis client with C parser for performance |
| **Task Queue** | `celery[redis]` | Background experiment execution |
| **Auth/Security** | `python-jose[cryptography]`, `passlib[bcrypt]`, `cryptography` | JWT, password hashing, Fernet encryption |
| **LLM** | `openai`, `httpx` | OpenAI/Azure SDK, async HTTP client for LLM Gateway |
| **Red Teaming** | `pyrit` | Microsoft's AI red teaming toolkit |
| **Validation** | `pydantic`, `pydantic-settings`, `email-validator` | Data validation, env config, email format |
| **Utilities** | `python-dotenv`, `orjson`, `tenacity`, `structlog` | Env loading, fast JSON, retry logic, structured logging |

### Dev/Test Stack

| Category | Packages | Purpose |
|---|---|---|
| **Testing** | `pytest`, `pytest-asyncio`, `pytest-cov` | Async test runner, coverage |
| **Fixtures** | `factory-boy`, `faker` | Test data factories |
| **Linting** | `ruff`, `mypy` | Linter/formatter + type checker |
| **Type Stubs** | `types-redis`, `types-passlib`, `sqlalchemy[mypy]` | Type checking support |

---

## 2. PostgreSQL Schema Overview

All tables are managed by Alembic migrations. This is the conceptual schema — actual models and migrations are implemented in later phases.

### Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login identifier |
| `hashed_password` | VARCHAR(255) | NOT NULL | bcrypt hash |
| `role` | VARCHAR(20) | NOT NULL, default 'member' | 'admin' or 'member' |
| `is_active` | BOOLEAN | NOT NULL, default true | Soft disable |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, auto-update | |

### Table: `model_providers`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `name` | VARCHAR(100) | NOT NULL | Display name |
| `provider_type` | VARCHAR(50) | NOT NULL | 'openai' or 'azure_openai' |
| `encrypted_api_key` | TEXT | NOT NULL | Fernet-encrypted API key |
| `endpoint_url` | VARCHAR(500) | NULL | Required for Azure only |
| `is_valid` | BOOLEAN | NOT NULL, default false | Set true after validation |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

### Table: `projects`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, NOT NULL | Owner |
| `name` | VARCHAR(200) | NOT NULL | |
| `description` | VARCHAR(255) | NULL | |
| `business_scope` | TEXT | NOT NULL | Free-text business scope |
| `allowed_intents` | JSONB | NOT NULL, default '[]' | Array of allowed intent strings |
| `restricted_intents` | JSONB | NOT NULL, default '[]' | Array of restricted intent strings |
| `analyzed_scope` | JSONB | NULL | AI-structured scope output |
| `api_key_hash` | VARCHAR(255) | UNIQUE, NOT NULL | Hashed project API key (for firewall) |
| `api_key_prefix` | VARCHAR(10) | NOT NULL | First 8 chars for identification |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Index**: `idx_projects_api_key_hash` on `api_key_hash` (firewall auth lookup)

### Table: `experiments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `project_id` | UUID | FK → projects.id, NOT NULL | Parent project |
| `name` | VARCHAR(200) | NOT NULL | |
| `description` | TEXT | NULL | |
| `experiment_type` | VARCHAR(50) | NOT NULL | 'adversarial' or 'behavioural' |
| `sub_type` | VARCHAR(50) | NOT NULL | 'owasp_top10', 'owasp_agentic', 'adaptive', 'user_interaction', 'functional', 'edge_case' |
| `turn_mode` | VARCHAR(20) | NOT NULL | 'single' or 'multi' |
| `testing_level` | VARCHAR(20) | NOT NULL | 'quick', 'thorough', 'comprehensive' |
| `language` | VARCHAR(10) | NOT NULL, default 'en' | ISO 639-1 |
| `provider_id` | UUID | FK → model_providers.id, NOT NULL | Model used for judging |
| `target_config` | JSONB | NOT NULL | { endpoint_url, headers, payload_template, auth, streaming } |
| `status` | VARCHAR(20) | NOT NULL, default 'pending' | 'pending', 'running', 'completed', 'failed', 'cancelled' |
| `progress_total` | INTEGER | NULL | Total tests planned |
| `progress_completed` | INTEGER | NULL, default 0 | Tests completed so far |
| `analytics` | JSONB | NULL | Pre-computed dashboard data (TPI, rates, insights) |
| `started_at` | TIMESTAMPTZ | NULL | |
| `completed_at` | TIMESTAMPTZ | NULL | |
| `error_message` | TEXT | NULL | If status = 'failed' |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Index**: `idx_experiments_project_status` on `(project_id, status)` (listing experiments per project)

### Table: `test_results`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `experiment_id` | UUID | FK → experiments.id, NOT NULL | Parent experiment |
| `prompt` | TEXT | NOT NULL | Test prompt sent to target AI |
| `response` | TEXT | NULL | Target AI response (null if error) |
| `result` | VARCHAR(10) | NOT NULL | 'pass', 'fail', 'error' |
| `severity` | VARCHAR(10) | NULL | 'low', 'medium', 'high' (null if pass) |
| `risk_category` | VARCHAR(50) | NULL | OWASP category ID |
| `data_strategy` | VARCHAR(100) | NULL | How the test was generated |
| `explanation` | TEXT | NULL | LLM-as-Judge reasoning |
| `conversation` | JSONB | NULL | Full multi-turn conversation (array of messages) |
| `is_representative` | BOOLEAN | NOT NULL, default false | Flagged as representative sample |
| `latency_ms` | INTEGER | NULL | Round-trip time to target AI |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Indexes**:
- `idx_test_results_experiment` on `experiment_id`
- `idx_test_results_experiment_result` on `(experiment_id, result)` (filtered log queries)
- `idx_test_results_experiment_category` on `(experiment_id, risk_category)` (category breakdown)

### Table: `feedback`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `test_result_id` | UUID | FK → test_results.id, NOT NULL | |
| `user_id` | UUID | FK → users.id, NOT NULL | Who gave feedback |
| `vote` | VARCHAR(10) | NOT NULL | 'up' or 'down' |
| `correction` | VARCHAR(10) | NULL | 'pass', 'low', 'medium', 'high' |
| `comment` | VARCHAR(150) | NULL | Free-text comment |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Unique**: `uq_feedback_result_user` on `(test_result_id, user_id)` — one feedback per user per result

### Table: `firewall_logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `project_id` | UUID | FK → projects.id, NOT NULL | |
| `prompt_hash` | VARCHAR(64) | NOT NULL | SHA-256 of prompt (not raw prompt by default) |
| `prompt_preview` | VARCHAR(200) | NULL | First 200 chars for UI display |
| `agent_prompt_hash` | VARCHAR(64) | NULL | SHA-256 of agent_prompt if provided |
| `verdict_status` | BOOLEAN | NOT NULL | true = safe, false = unsafe |
| `fail_category` | VARCHAR(30) | NULL | 'off_topic', 'violation', 'restriction' |
| `explanation` | TEXT | NULL | Judge explanation |
| `confidence` | FLOAT | NULL | 0.0–1.0 |
| `latency_ms` | INTEGER | NOT NULL | Total processing time |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Indexes**:
- `idx_firewall_logs_project_created` on `(project_id, created_at DESC)` (recent logs listing)
- `idx_firewall_logs_project_status` on `(project_id, verdict_status)` (stats aggregation)

### Table: `audit_logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, NULL | NULL for system actions |
| `action` | VARCHAR(50) | NOT NULL | 'create', 'update', 'delete', 'login', 'launch' |
| `entity_type` | VARCHAR(50) | NOT NULL | 'user', 'provider', 'project', 'experiment' |
| `entity_id` | UUID | NULL | ID of affected entity |
| `details` | JSONB | NULL | Additional context |
| `ip_address` | VARCHAR(45) | NULL | Client IP |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Index**: `idx_audit_logs_created` on `created_at DESC` (recent audit trail)

### Schema Relationships

```
users 1─────┬──── N model_providers
             ├──── N projects
             ├──── N feedback
             └──── N audit_logs

projects 1──┬──── N experiments
             └──── N firewall_logs

experiments 1──── N test_results

test_results 1─── N feedback (max 1 per user via unique constraint)
```

---

## 3. Redis Usage Plan

Redis serves three distinct roles, each on a separate logical database to isolate concerns:

| DB | Purpose | Key Pattern | TTL | Notes |
|---|---|---|---|---|
| **DB 0** | Celery broker + result backend | Celery-managed keys | Celery-managed | Message queue for experiment tasks |
| **DB 1** | Application cache | `cache:*` | Varies | Project scope, provider configs |
| **DB 2** | Rate limiting | `ratelimit:*` | Auto-expire | Sliding window counters |

### Key Patterns

```
# --- Celery (DB 0) — managed by Celery, do not touch manually ---
celery-task-meta-{task_id}         # Task result
_kombu.binding.*                   # Queue bindings

# --- Application Cache (DB 1) ---
cache:project:{project_id}:scope   # Cached project scope + intents for firewall
                                    # TTL: 300s (5 min)
                                    # Value: JSON { business_scope, allowed_intents, restricted_intents, analyzed_scope }
                                    # Invalidated: on project update

cache:provider:{provider_id}       # Cached provider config (type, endpoint)
                                    # TTL: 600s (10 min)
                                    # Value: JSON { provider_type, endpoint_url }
                                    # Note: API key is NOT cached — decrypted from DB at point-of-use

cache:apikey:{key_hash}:project    # Cached API key → project_id mapping for firewall auth
                                    # TTL: 300s (5 min)
                                    # Value: project_id string

# --- Experiment Progress (DB 1) ---
experiment:{experiment_id}:progress # Live progress during execution
                                    # TTL: 86400s (24h, auto-cleanup)
                                    # Value: JSON { completed, total, status, current_batch }
                                    # Written by: Celery worker
                                    # Read by: API status polling endpoint

experiment:{experiment_id}:cancel   # Cancellation flag
                                    # TTL: 86400s
                                    # Value: "1"
                                    # Set by: API cancel endpoint
                                    # Read by: Celery worker between batches

# --- Rate Limiting (DB 2) ---
ratelimit:firewall:{project_id}:{window}  # Firewall rate limit counter
                                           # TTL: 60s (auto-expire per window)
                                           # Value: integer (request count)
                                           # Algorithm: sliding window counter

ratelimit:api:{user_id}:{window}          # API rate limit counter
                                           # TTL: 60s
                                           # Value: integer
```

### Memory Budget

| Component | Estimated Size | Notes |
|---|---|---|
| Celery queues | ~5 MB | Small payloads (just experiment IDs) |
| Project scope cache | ~1 KB per project | Scope text + intent lists |
| Experiment progress | ~200 bytes per active experiment | Only exists while running |
| Rate limit counters | ~100 bytes per active window | Auto-expire, very small |
| **Total estimated** | **< 50 MB** | Well within 256 MB maxmemory |

### Eviction Policy

`allkeys-lru` — if memory fills up, least-recently-used keys are evicted first. This is safe because:
- All cached data can be re-fetched from PostgreSQL
- Rate limit keys auto-expire and are transient
- Experiment progress is also written to PostgreSQL on completion

---

## 4. Docker Architecture Summary

### Production (`docker-compose.yml`)

```
┌─────────────────────────────────────────────┐
│                   nginx                      │
│         :80 / :443 (TLS terminates here)     │
├──────────┬──────────────┬───────────────────┤
│          │              │                    │
│   /api/* │   /firewall  │        /*          │
│          │              │                    │
│    ┌─────▼──────┐  ┌────▼────┐  ┌──────────┐│
│    │  api (:8000)│  │  (same) │  │ frontend ││
│    │  FastAPI    │  │         │  │  nginx   ││
│    │  4 workers  │  │         │  │  static  ││
│    └──────┬──────┘  └─────────┘  └──────────┘│
│           │                                  │
│    ┌──────▼──────┐                           │
│    │   worker    │                           │
│    │   Celery    │                           │
│    │  4 concurr. │                           │
│    └──────┬──────┘                           │
│           │                                  │
│    ┌──────▼──────┐  ┌──────────┐             │
│    │   redis     │  │ postgres │             │
│    │   :6379     │  │  :5432   │             │
│    └─────────────┘  └──────────┘             │
└─────────────────────────────────────────────┘
```

### Development (`docker-compose.dev.yml` overlay)

- **API**: Hot reload via `uvicorn --reload`, source code mounted as volume
- **Worker**: Hot reload via `watchfiles`, source code mounted
- **Frontend**: Vite dev server with HMR on `:5173` (not nginx)
- **Nginx**: Disabled (Vite proxies directly to API)
- **Postgres**: `devpassword`, exposed on `:5432` for local tools
- **Redis**: No password, exposed on `:6379` for `redis-cli`

---

*This document covers all environment and infrastructure setup. No business logic or endpoints are included.*
