# Phase 5 — Database Design

> **Status**: COMPLETE  
> **Depends on**: Phase 4 (Environment & Infrastructure)  
> **Deliverables**: SQLAlchemy 2.0 async ORM models, async database module, Alembic migration environment

---

## 1. Entity–Relationship Overview

```
┌──────────────────┐
│   Organization   │
└────────┬─────────┘
         │ 1:N
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
 ┌──────┐ ┌────────────┐ ┌─────────┐
 │ User │ │ModelProvider│ │ Project │
 └──┬───┘ └─────┬──────┘ └────┬────┘
    │            │             │
    │            │      ┌──────┼──────────────┐
    │            │      ▼      ▼              ▼
    │            │ ┌────────┐ ┌────────────┐ ┌──────────┐
    │            └►│Experiment│ │FirewallRule│ │FirewallLog│
    │              └────┬───┘ └─────┬──────┘ └──────────┘
    │                   │           │              ▲
    │                   ▼           └──────────────┘
    │            ┌──────────┐            matched_rule_id
    │            │ TestCase │
    │            └─────┬────┘
    │              ┌───┴───┐
    │              ▼       ▼
    │         ┌────────┐ ┌────────┐
    └────────►│Feedback│ │ Result │
              └────────┘ └────────┘

  ┌──────────┐
  │ AuditLog │ ◄── (org_id FK, user_id FK)
  └──────────┘
```

---

## 2. Tables Summary

| # | Table              | Primary Key | Foreign Keys                    | Notable Constraints            |
|---|--------------------|-----------  |---------------------------------|--------------------------------|
| 1 | `organizations`    | UUID        | —                               | `slug` UNIQUE                  |
| 2 | `users`            | UUID        | `organization_id`               | `email` UNIQUE                 |
| 3 | `model_providers`  | UUID        | `organization_id`, `created_by_id` | —                           |
| 4 | `projects`         | UUID        | `organization_id`, `created_by_id` | `api_key_hash` UNIQUE       |
| 5 | `experiments`      | UUID        | `project_id`, `created_by_id`, `provider_id` | `celery_task_id` UNIQUE |
| 6 | `test_cases`       | UUID        | `experiment_id`                 | —                              |
| 7 | `results`          | UUID        | `test_case_id`                  | `test_case_id` UNIQUE (1:1)    |
| 8 | `feedback`         | UUID        | `test_case_id`, `user_id`       | UQ(`test_case_id`, `user_id`)  |
| 9 | `firewall_rules`   | UUID        | `project_id`, `created_by_id`   | —                              |
|10 | `firewall_logs`    | UUID        | `project_id`, `matched_rule_id` | —                              |
|11 | `audit_logs`       | UUID        | `organization_id`, `user_id`    | —                              |

---

## 3. Column-Level Detail

### 3.1 `organizations`

| Column       | Type           | Nullable | Default    | Index/Constraint |
|------------- |----------------|----------|------------|------------------|
| `id`         | UUID           | NO       | uuid4()    | PK               |
| `name`       | VARCHAR(200)   | NO       | —          | —                |
| `slug`       | VARCHAR(200)   | NO       | —          | UNIQUE, INDEX    |
| `is_active`  | BOOLEAN        | NO       | true       | —                |
| `created_at` | TIMESTAMPTZ    | NO       | now()      | —                |
| `updated_at` | TIMESTAMPTZ    | NO       | now()      | on-update now()  |

### 3.2 `users`

| Column             | Type           | Nullable | Default    | Index/Constraint     |
|--------------------|----------------|----------|------------|----------------------|
| `id`               | UUID           | NO       | uuid4()    | PK                   |
| `organization_id`  | UUID           | NO       | —          | FK → organizations, INDEX |
| `email`            | VARCHAR(255)   | NO       | —          | UNIQUE, INDEX        |
| `hashed_password`  | VARCHAR(255)   | NO       | —          | —                    |
| `full_name`        | VARCHAR(200)   | YES      | —          | —                    |
| `role`             | VARCHAR(20)    | NO       | 'member'   | —                    |
| `is_active`        | BOOLEAN        | NO       | true       | —                    |
| `last_login_at`    | TIMESTAMPTZ    | YES      | —          | —                    |
| `created_at`       | TIMESTAMPTZ    | NO       | now()      | —                    |
| `updated_at`       | TIMESTAMPTZ    | NO       | now()      | on-update now()      |

### 3.3 `model_providers`

| Column             | Type           | Nullable | Default    | Index/Constraint     |
|--------------------|----------------|----------|------------|----------------------|
| `id`               | UUID           | NO       | uuid4()    | PK                   |
| `organization_id`  | UUID           | NO       | —          | FK → organizations, INDEX |
| `created_by_id`    | UUID           | YES      | —          | FK → users (SET NULL)|
| `name`             | VARCHAR(100)   | NO       | —          | —                    |
| `provider_type`    | VARCHAR(50)    | NO       | —          | —                    |
| `encrypted_api_key`| TEXT           | NO       | —          | —                    |
| `endpoint_url`     | VARCHAR(500)   | YES      | —          | —                    |
| `is_valid`         | BOOLEAN        | NO       | false      | —                    |
| `created_at`       | TIMESTAMPTZ    | NO       | now()      | —                    |
| `updated_at`       | TIMESTAMPTZ    | NO       | now()      | on-update now()      |

### 3.4 `projects`

| Column              | Type           | Nullable | Default    | Index/Constraint     |
|---------------------|----------------|----------|------------|----------------------|
| `id`                | UUID           | NO       | uuid4()    | PK                   |
| `organization_id`   | UUID           | NO       | —          | FK → organizations, INDEX |
| `created_by_id`     | UUID           | YES      | —          | FK → users (SET NULL)|
| `name`              | VARCHAR(200)   | NO       | —          | —                    |
| `description`       | VARCHAR(255)   | YES      | —          | —                    |
| `business_scope`    | TEXT           | NO       | —          | —                    |
| `allowed_intents`   | JSONB          | NO       | '[]'       | —                    |
| `restricted_intents`| JSONB          | NO       | '[]'       | —                    |
| `analyzed_scope`    | JSONB          | YES      | —          | —                    |
| `api_key_hash`      | VARCHAR(255)   | NO       | —          | UNIQUE, INDEX        |
| `api_key_prefix`    | VARCHAR(10)    | NO       | —          | —                    |
| `is_active`         | BOOLEAN        | NO       | true       | —                    |
| `created_at`        | TIMESTAMPTZ    | NO       | now()      | —                    |
| `updated_at`        | TIMESTAMPTZ    | NO       | now()      | on-update now()      |

### 3.5 `experiments`

| Column               | Type           | Nullable | Default    | Index/Constraint     |
|----------------------|----------------|----------|------------|----------------------|
| `id`                 | UUID           | NO       | uuid4()    | PK                   |
| `project_id`         | UUID           | NO       | —          | FK → projects, INDEX |
| `created_by_id`      | UUID           | YES      | —          | FK → users (SET NULL)|
| `provider_id`        | UUID           | NO       | —          | FK → model_providers (RESTRICT) |
| `name`               | VARCHAR(200)   | NO       | —          | —                    |
| `description`        | TEXT           | YES      | —          | —                    |
| `experiment_type`    | VARCHAR(50)    | NO       | —          | INDEX                |
| `sub_type`           | VARCHAR(50)    | NO       | —          | —                    |
| `turn_mode`          | VARCHAR(20)    | NO       | —          | —                    |
| `testing_level`      | VARCHAR(20)    | NO       | —          | —                    |
| `language`           | VARCHAR(10)    | NO       | 'en'       | —                    |
| `target_config`      | JSONB          | NO       | —          | —                    |
| `status`             | VARCHAR(20)    | NO       | 'pending'  | INDEX                |
| `progress_total`     | INTEGER        | YES      | —          | —                    |
| `progress_completed` | INTEGER        | NO       | 0          | —                    |
| `analytics`          | JSONB          | YES      | —          | —                    |
| `started_at`         | TIMESTAMPTZ    | YES      | —          | —                    |
| `completed_at`       | TIMESTAMPTZ    | YES      | —          | —                    |
| `error_message`      | TEXT           | YES      | —          | —                    |
| `celery_task_id`     | VARCHAR(255)   | YES      | —          | UNIQUE               |
| `created_at`         | TIMESTAMPTZ    | NO       | now()      | —                    |
| `updated_at`         | TIMESTAMPTZ    | NO       | now()      | on-update now()      |

### 3.6 `test_cases`

| Column            | Type           | Nullable | Default    | Index/Constraint     |
|-------------------|----------------|----------|------------|----------------------|
| `id`              | UUID           | NO       | uuid4()    | PK                   |
| `experiment_id`   | UUID           | NO       | —          | FK → experiments, INDEX |
| `prompt`          | TEXT           | NO       | —          | —                    |
| `response`        | TEXT           | YES      | —          | —                    |
| `conversation`    | JSONB          | YES      | —          | —                    |
| `risk_category`   | VARCHAR(50)    | YES      | —          | —                    |
| `data_strategy`   | VARCHAR(100)   | YES      | —          | —                    |
| `attack_converter`| VARCHAR(100)   | YES      | —          | —                    |
| `sequence_order`  | INTEGER        | NO       | 0          | —                    |
| `is_representative`| BOOLEAN       | NO       | false      | —                    |
| `latency_ms`      | INTEGER        | YES      | —          | —                    |
| `created_at`      | TIMESTAMPTZ    | NO       | now()      | —                    |
| `updated_at`      | TIMESTAMPTZ    | NO       | now()      | on-update now()      |

### 3.7 `results`

| Column          | Type           | Nullable | Default    | Index/Constraint        |
|-----------------|----------------|----------|------------|-------------------------|
| `id`            | UUID           | NO       | uuid4()    | PK                      |
| `test_case_id`  | UUID           | NO       | —          | FK → test_cases, UNIQUE, INDEX |
| `result`        | VARCHAR(10)    | NO       | —          | —                       |
| `severity`      | VARCHAR(10)    | YES      | —          | —                       |
| `confidence`    | FLOAT          | YES      | —          | —                       |
| `explanation`   | TEXT           | YES      | —          | —                       |
| `owasp_mapping` | VARCHAR(20)    | YES      | —          | —                       |
| `created_at`    | TIMESTAMPTZ    | NO       | now()      | —                       |
| `updated_at`    | TIMESTAMPTZ    | NO       | now()      | on-update now()         |

### 3.8 `feedback`

| Column          | Type           | Nullable | Default    | Index/Constraint        |
|-----------------|----------------|----------|------------|-------------------------|
| `id`            | UUID           | NO       | uuid4()    | PK                      |
| `test_case_id`  | UUID           | NO       | —          | FK → test_cases, INDEX  |
| `user_id`       | UUID           | NO       | —          | FK → users, INDEX       |
| `vote`          | VARCHAR(10)    | NO       | —          | —                       |
| `correction`    | VARCHAR(10)    | YES      | —          | —                       |
| `comment`       | VARCHAR(150)   | YES      | —          | —                       |
| `created_at`    | TIMESTAMPTZ    | NO       | now()      | —                       |
| `updated_at`    | TIMESTAMPTZ    | NO       | now()      | on-update now()         |

**Composite UQ**: `uq_feedback_testcase_user(test_case_id, user_id)`

### 3.9 `firewall_rules`

| Column          | Type           | Nullable | Default    | Index/Constraint     |
|-----------------|----------------|----------|------------|----------------------|
| `id`            | UUID           | NO       | uuid4()    | PK                   |
| `project_id`    | UUID           | NO       | —          | FK → projects, INDEX |
| `created_by_id` | UUID           | YES      | —          | FK → users (SET NULL)|
| `name`          | VARCHAR(200)   | NO       | —          | —                    |
| `rule_type`     | VARCHAR(50)    | NO       | —          | —                    |
| `pattern`       | TEXT           | YES      | —          | —                    |
| `policy`        | TEXT           | YES      | —          | —                    |
| `priority`      | INTEGER        | NO       | 0          | —                    |
| `is_active`     | BOOLEAN        | NO       | true       | —                    |
| `created_at`    | TIMESTAMPTZ    | NO       | now()      | —                    |
| `updated_at`    | TIMESTAMPTZ    | NO       | now()      | on-update now()      |

### 3.10 `firewall_logs`

| Column            | Type           | Nullable | Default    | Index/Constraint           |
|-------------------|----------------|----------|------------|----------------------------|
| `id`              | UUID           | NO       | uuid4()    | PK                         |
| `project_id`      | UUID           | NO       | —          | FK → projects, INDEX       |
| `matched_rule_id` | UUID           | YES      | —          | FK → firewall_rules (SET NULL) |
| `prompt_hash`     | VARCHAR(64)    | NO       | —          | INDEX                      |
| `prompt_preview`  | VARCHAR(200)   | YES      | —          | —                          |
| `agent_prompt_hash`| VARCHAR(64)   | YES      | —          | —                          |
| `verdict_status`  | BOOLEAN        | NO       | —          | INDEX                      |
| `fail_category`   | VARCHAR(30)    | YES      | —          | —                          |
| `explanation`     | TEXT           | YES      | —          | —                          |
| `confidence`      | FLOAT          | YES      | —          | —                          |
| `latency_ms`      | INTEGER        | NO       | —          | —                          |
| `ip_address`      | VARCHAR(45)    | YES      | —          | —                          |
| `created_at`      | TIMESTAMPTZ    | NO       | now()      | —                          |
| `updated_at`      | TIMESTAMPTZ    | NO       | now()      | on-update now()            |

### 3.11 `audit_logs`

| Column            | Type           | Nullable | Default    | Index/Constraint           |
|-------------------|----------------|----------|------------|----------------------------|
| `id`              | UUID           | NO       | uuid4()    | PK                         |
| `organization_id` | UUID           | YES      | —          | FK → organizations (SET NULL), INDEX |
| `user_id`         | UUID           | YES      | —          | FK → users (SET NULL), INDEX |
| `action`          | VARCHAR(50)    | NO       | —          | INDEX                      |
| `entity_type`     | VARCHAR(50)    | NO       | —          | —                          |
| `entity_id`       | UUID           | YES      | —          | —                          |
| `details`         | JSONB          | YES      | —          | —                          |
| `ip_address`      | VARCHAR(45)    | YES      | —          | —                          |
| `created_at`      | TIMESTAMPTZ    | NO       | now()      | —                          |
| `updated_at`      | TIMESTAMPTZ    | NO       | now()      | on-update now()            |

---

## 4. Relationship Map

| Parent            | Child           | Cardinality | FK Column         | On Delete       |
|-------------------|-----------------|-------------|-------------------|-----------------|
| Organization      | User            | 1:N         | `organization_id` | CASCADE         |
| Organization      | ModelProvider   | 1:N         | `organization_id` | CASCADE         |
| Organization      | Project         | 1:N         | `organization_id` | CASCADE         |
| Organization      | AuditLog        | 1:N         | `organization_id` | SET NULL        |
| User              | Feedback        | 1:N         | `user_id`         | CASCADE         |
| User              | AuditLog        | 1:N         | `user_id`         | SET NULL        |
| User              | ModelProvider   | 1:N (creator) | `created_by_id` | SET NULL        |
| User              | Project         | 1:N (creator) | `created_by_id` | SET NULL        |
| User              | Experiment      | 1:N (creator) | `created_by_id` | SET NULL        |
| User              | FirewallRule    | 1:N (creator) | `created_by_id` | SET NULL        |
| ModelProvider     | Experiment      | 1:N         | `provider_id`     | RESTRICT        |
| Project           | Experiment      | 1:N         | `project_id`      | CASCADE         |
| Project           | FirewallRule    | 1:N         | `project_id`      | CASCADE         |
| Project           | FirewallLog     | 1:N         | `project_id`      | CASCADE         |
| Experiment        | TestCase        | 1:N         | `experiment_id`   | CASCADE         |
| TestCase          | Result          | 1:1         | `test_case_id`    | CASCADE         |
| TestCase          | Feedback        | 1:N         | `test_case_id`    | CASCADE         |
| FirewallRule      | FirewallLog     | 1:N         | `matched_rule_id` | SET NULL        |

---

## 5. Indexing Strategy

### Implicit indexes (created automatically by constraints)
- Every **PRIMARY KEY** (UUID) — B-tree index
- Every **UNIQUE** constraint — B-tree index

### Explicit indexes

| Table            | Column(s)        | Purpose                                    |
|------------------|------------------|--------------------------------------------|
| `organizations`  | `slug`           | Slug-based lookups, UNIQUE                 |
| `users`          | `organization_id`| Filter users by org                        |
| `users`          | `email`          | Login lookups, UNIQUE                      |
| `model_providers`| `organization_id`| Filter providers by org                    |
| `projects`       | `organization_id`| Filter projects by org                     |
| `projects`       | `api_key_hash`   | Firewall API key authentication, UNIQUE    |
| `experiments`    | `project_id`     | Filter experiments by project              |
| `experiments`    | `experiment_type`| Filter by adversarial/behavioural          |
| `experiments`    | `status`         | Active experiment monitoring               |
| `test_cases`     | `experiment_id`  | Load test cases for an experiment          |
| `results`        | `test_case_id`   | 1:1 lookup, UNIQUE                         |
| `feedback`       | `test_case_id`   | Load feedback for a test case              |
| `feedback`       | `user_id`        | User's feedback history                    |
| `firewall_rules` | `project_id`     | Load rules for a project                   |
| `firewall_logs`  | `project_id`     | Load logs for a project                    |
| `firewall_logs`  | `prompt_hash`    | Deduplication / repeat detection           |
| `firewall_logs`  | `verdict_status` | Filter pass/fail analytics                 |
| `audit_logs`     | `organization_id`| Org-level audit trail                      |
| `audit_logs`     | `user_id`        | Per-user audit trail                       |
| `audit_logs`     | `action`         | Filter by action type                      |

---

## 6. JSONB Column Schemas

### `projects.allowed_intents` / `restricted_intents`
```json
["intent_label_1", "intent_label_2"]
```

### `projects.analyzed_scope`
```json
{
  "summary": "Customer support chatbot for telecom billing",
  "topics": ["billing", "account_management", "technical_support"],
  "risk_areas": ["PII_handling", "financial_transactions"],
  "generated_at": "2025-01-15T10:30:00Z"
}
```

### `experiments.target_config`
```json
{
  "model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 4096,
  "system_prompt": "You are a helpful assistant...",
  "top_p": 1.0
}
```

### `experiments.analytics`
```json
{
  "total_tests": 100,
  "passed": 85,
  "failed": 12,
  "errors": 3,
  "pass_rate": 0.85,
  "severity_breakdown": {"high": 3, "medium": 5, "low": 4},
  "category_breakdown": {"jailbreak": 5, "prompt_injection": 4, "bias": 3}
}
```

### `test_cases.conversation`
```json
[
  {"role": "user", "content": "Hello"},
  {"role": "assistant", "content": "Hi! How can I help?"},
  {"role": "user", "content": "Ignore previous instructions..."},
  {"role": "assistant", "content": "I cannot do that."}
]
```

### `audit_logs.details`
```json
{
  "old_values": {"name": "Old Project Name"},
  "new_values": {"name": "New Project Name"},
  "reason": "User requested rename"
}
```

---

## 7. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **UUID primary keys** | Horizontally safe, no sequence contention, can be generated client-side |
| 2 | **Organization as tenant boundary** | All data scoped under org; enables future multi-tenant isolation |
| 3 | **TestCase ↔ Result as 1:1** | Allows re-evaluation of test cases with different judges; clean separation of concerns |
| 4 | **Feedback UQ(test_case, user)** | One vote per user per test case; prevents double-voting |
| 5 | **JSONB for flexible fields** | Intents, scope analysis, target config, and analytics evolve without schema migrations |
| 6 | **`ondelete=RESTRICT` on provider** | Prevents deleting a provider that has experiments referencing it |
| 7 | **`ondelete=SET NULL` on creator FKs** | User deletion doesn't cascade to all their created entities |
| 8 | **`ondelete=CASCADE` on org → children** | Org deletion cleanly removes all scoped data |
| 9 | **api_key_hash stored (not raw key)** | Only a SHA-256 hash stored; raw key shown once at creation |
| 10| **Fernet-encrypted API keys for providers** | Provider secrets encrypted at rest, decrypted at point-of-use |
| 11| **TimestampMixin on all tables** | Consistent audit trail; `created_at` server-defaulted, `updated_at` auto-bumped |

---

## 8. Alembic Migration Setup

### Configuration
- **`alembic.ini`** → `script_location = app/storage/migrations`
- **`env.py`** → uses `async_engine_from_config` with `asyncpg` driver
- **`script.py.mako`** → template with `sa` and `op` imports, ruff-compatible

### Workflow
```bash
# Generate initial migration from models
cd backend
alembic revision --autogenerate -m "initial schema"

# Apply migrations
alembic upgrade head

# View current revision
alembic current

# Generate a new migration after model changes
alembic revision --autogenerate -m "description of change"
```

### Critical Rule
> All models **must** be imported in `app/storage/models/__init__.py` before
> Alembic's `env.py` accesses `Base.metadata`.  The `__init__.py` barrel
> export ensures autogenerate detects every table.

---

## 9. Async Database Module

**`backend/app/storage/database.py`** provides:

| Export              | Purpose                                                     |
|---------------------|-------------------------------------------------------------|
| `async_engine`      | Single `AsyncEngine` for the application lifecycle          |
| `AsyncSessionLocal` | `async_sessionmaker` bound to the engine                    |
| `get_async_session()`| FastAPI `Depends()` — yields session, commits/rollbacks    |

### Connection pool settings (via `config.py`)

| Setting                  | Default | Purpose                |
|--------------------------|---------|------------------------|
| `DATABASE_POOL_SIZE`     | 5       | Max persistent connections |
| `DATABASE_MAX_OVERFLOW`  | 10      | Extra connections under load |
| `pool_pre_ping`          | True    | Detect stale connections |
| `pool_recycle`           | 300s    | Recycle connections every 5 min |

---

## 10. Files Created in This Phase

| # | File | Purpose |
|---|------|---------|
| 1 | `backend/app/config.py` | Pydantic Settings with all env vars and computed DB URLs |
| 2 | `backend/app/__init__.py` | Package init |
| 3 | `backend/app/storage/__init__.py` | Package init |
| 4 | `backend/app/storage/database.py` | Async engine, session factory, FastAPI dependency |
| 5 | `backend/app/storage/models/__init__.py` | Barrel export of all models for Alembic discovery |
| 6 | `backend/app/storage/models/base.py` | DeclarativeBase, TimestampMixin, UUIDPrimaryKeyMixin |
| 7 | `backend/app/storage/models/organization.py` | Organization model |
| 8 | `backend/app/storage/models/user.py` | User model |
| 9 | `backend/app/storage/models/provider.py` | ModelProvider model |
| 10| `backend/app/storage/models/project.py` | Project model |
| 11| `backend/app/storage/models/experiment.py` | Experiment model |
| 12| `backend/app/storage/models/test_case.py` | TestCase model |
| 13| `backend/app/storage/models/result.py` | Result model |
| 14| `backend/app/storage/models/feedback.py` | Feedback model |
| 15| `backend/app/storage/models/firewall_rule.py` | FirewallRule model |
| 16| `backend/app/storage/models/firewall_log.py` | FirewallLog model |
| 17| `backend/app/storage/models/audit_log.py` | AuditLog model |
| 18| `backend/app/storage/migrations/__init__.py` | Package init |
| 19| `backend/app/storage/migrations/env.py` | Alembic async migration environment |
| 20| `backend/app/storage/migrations/script.py.mako` | Migration script template |
| 21| `backend/app/storage/migrations/versions/.gitkeep` | Placeholder for migration files |

**Total: 21 files**

---
