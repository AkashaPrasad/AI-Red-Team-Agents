# PHASE 3 — Monorepo Structure

---

```
ai-red-team-agent/
│
├── backend/                                    # FastAPI application (Python 3.11)
│   ├── app/                                    # Application root package
│   │   ├── __init__.py
│   │   ├── main.py                             # FastAPI app factory, lifespan, middleware registration
│   │   ├── config.py                           # Pydantic BaseSettings, env-driven configuration
│   │   ├── dependencies.py                     # Shared FastAPI dependency injection (get_db, get_current_user, etc.)
│   │   │
│   │   ├── api/                                # HTTP layer — routes, request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── router.py                       # Top-level APIRouter that includes all sub-routers
│   │   │   ├── v1/                             # API version namespace
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py                     # POST /auth/register, /auth/login, /auth/refresh, /auth/me
│   │   │   │   ├── providers.py                # CRUD /providers — model provider management
│   │   │   │   ├── projects.py                 # CRUD /projects — project management + scope analysis
│   │   │   │   ├── experiments.py              # CRUD /projects/:id/experiments — create, list, status, cancel
│   │   │   │   ├── results.py                  # GET /experiments/:id/results, /logs — dashboard + logs
│   │   │   │   ├── feedback.py                 # POST /experiments/:eid/logs/:lid/feedback
│   │   │   │   └── firewall.py                 # POST /firewall/:project_id — public verdict endpoint
│   │   │   └── schemas/                        # Pydantic request/response models (one file per domain)
│   │   │       ├── __init__.py
│   │   │       ├── auth.py
│   │   │       ├── providers.py
│   │   │       ├── projects.py
│   │   │       ├── experiments.py
│   │   │       ├── results.py
│   │   │       ├── feedback.py
│   │   │       └── firewall.py
│   │   │
│   │   ├── core/                               # Business logic — pure domain services, no HTTP concerns
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py                 # Register, login, JWT issue/verify, password hashing
│   │   │   ├── provider_service.py             # Provider CRUD logic, credential validation
│   │   │   ├── project_service.py              # Project CRUD, scope analysis orchestration
│   │   │   ├── experiment_service.py           # Experiment creation, launch (Celery dispatch), status, cancel
│   │   │   ├── results_service.py              # Dashboard aggregation, log queries, representative sampling
│   │   │   └── feedback_service.py             # Feedback upsert, validation
│   │   │
│   │   ├── attacks/                            # Adversarial test generation — PyRIT integration
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py                 # Main orchestrator: selects strategies, runs generation loop
│   │   │   ├── strategies/                     # One strategy class per OWASP category
│   │   │   │   ├── __init__.py
│   │   │   │   ├── prompt_injection.py         # LLM01 — prompt injection attacks
│   │   │   │   ├── insecure_output.py          # LLM02 — insecure output handling probes
│   │   │   │   ├── data_poisoning.py           # LLM03 — training data extraction
│   │   │   │   ├── model_dos.py                # LLM04 — denial of service prompts
│   │   │   │   ├── supply_chain.py             # LLM05 — supply chain info probes
│   │   │   │   ├── info_disclosure.py          # LLM06 — sensitive information disclosure
│   │   │   │   ├── insecure_plugin.py          # LLM07 — plugin/tool abuse
│   │   │   │   ├── excessive_agency.py         # LLM08 — unauthorized action triggers
│   │   │   │   ├── overreliance.py             # LLM09 — hallucination/fabrication tests
│   │   │   │   └── model_theft.py              # LLM10 — model extraction attempts
│   │   │   ├── templates/                      # Static attack prompt templates (YAML files)
│   │   │   │   ├── owasp_llm_top10/            # Templates per OWASP LLM Top 10 category
│   │   │   │   │   ├── prompt_injection.yaml
│   │   │   │   │   ├── insecure_output.yaml
│   │   │   │   │   ├── data_poisoning.yaml
│   │   │   │   │   ├── model_dos.yaml
│   │   │   │   │   ├── supply_chain.yaml
│   │   │   │   │   ├── info_disclosure.yaml
│   │   │   │   │   ├── insecure_plugin.yaml
│   │   │   │   │   ├── excessive_agency.yaml
│   │   │   │   │   ├── overreliance.yaml
│   │   │   │   │   └── model_theft.yaml
│   │   │   │   ├── owasp_agentic/              # Templates for agentic AI threat scenarios
│   │   │   │   │   └── agentic_threats.yaml
│   │   │   │   └── behavioural/                # Templates for behavioural QA testing
│   │   │   │       ├── happy_path.yaml
│   │   │   │       ├── edge_cases.yaml
│   │   │   │       ├── error_handling.yaml
│   │   │   │       └── scope_validation.yaml
│   │   │   ├── converters/                     # PyRIT prompt converters (obfuscation, encoding)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base64_converter.py
│   │   │   │   ├── unicode_converter.py
│   │   │   │   ├── payload_splitting.py
│   │   │   │   └── jailbreak_converter.py
│   │   │   └── target.py                       # PyRIT PromptTarget adapter for customer AI endpoints
│   │   │
│   │   ├── evaluation/                         # LLM-as-Judge — response evaluation engine
│   │   │   ├── __init__.py
│   │   │   ├── judge.py                        # Core judge: constructs prompt, calls LLM, parses verdict
│   │   │   ├── prompts.py                      # Judge system prompt templates (experiment mode + firewall mode)
│   │   │   ├── scoring.py                      # TPI computation, pass rate, severity aggregation
│   │   │   └── insights.py                     # AI-generated insights (post-experiment summary via LLM)
│   │   │
│   │   ├── firewall/                           # Real-time firewall evaluation engine
│   │   │   ├── __init__.py
│   │   │   ├── engine.py                       # Verdict engine: load scope, call judge, return verdict
│   │   │   ├── rate_limiter.py                 # Redis sliding window rate limiter
│   │   │   └── cache.py                        # Redis cache for project scope/intents (TTL-based)
│   │   │
│   │   ├── storage/                            # Data persistence layer
│   │   │   ├── __init__.py
│   │   │   ├── database.py                     # Async engine, sessionmaker, get_session dependency
│   │   │   ├── models/                         # SQLAlchemy ORM models
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py                     # User model (email, hashed_password, role)
│   │   │   │   ├── provider.py                 # ModelProvider model (type, encrypted_api_key, endpoint)
│   │   │   │   ├── project.py                  # Project model (name, scope, intents, api_key_hash)
│   │   │   │   ├── experiment.py               # Experiment model (config, status, analytics_json)
│   │   │   │   ├── test_result.py              # TestResult model (prompt, response, verdict, severity)
│   │   │   │   ├── feedback.py                 # Feedback model (vote, correction, comment, user_id)
│   │   │   │   ├── firewall_log.py             # FirewallLog model (prompt_hash, verdict, latency)
│   │   │   │   └── audit_log.py                # AuditLog model (user, action, entity, timestamp)
│   │   │   ├── repositories/                   # Data access layer (one repo per aggregate)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user_repo.py
│   │   │   │   ├── provider_repo.py
│   │   │   │   ├── project_repo.py
│   │   │   │   ├── experiment_repo.py
│   │   │   │   ├── test_result_repo.py
│   │   │   │   ├── feedback_repo.py
│   │   │   │   ├── firewall_log_repo.py
│   │   │   │   └── audit_log_repo.py
│   │   │   └── migrations/                     # Alembic migrations directory
│   │   │       ├── env.py
│   │   │       ├── script.py.mako
│   │   │       └── versions/                   # Auto-generated migration files
│   │   │
│   │   ├── security/                           # Cross-cutting security concerns
│   │   │   ├── __init__.py
│   │   │   ├── encryption.py                   # Fernet encrypt/decrypt for secrets at rest
│   │   │   ├── jwt_handler.py                  # JWT creation, verification, refresh token logic
│   │   │   ├── rbac.py                         # Role-based access control decorators/dependencies
│   │   │   ├── api_key.py                      # Project API key generation, hashing, verification
│   │   │   └── audit.py                        # Audit logging middleware
│   │   │
│   │   ├── llm/                                # LLM Gateway — unified interface to model providers
│   │   │   ├── __init__.py
│   │   │   ├── gateway.py                      # Provider-agnostic LLM call interface
│   │   │   ├── adapters/                       # Provider-specific adapters
│   │   │   │   ├── __init__.py
│   │   │   │   ├── openai_adapter.py           # OpenAI API adapter
│   │   │   │   └── azure_openai_adapter.py     # Azure OpenAI API adapter
│   │   │   └── schemas.py                      # LLM request/response schemas (internal)
│   │   │
│   │   └── workers/                            # Celery worker tasks
│   │       ├── __init__.py
│   │       ├── celery_app.py                   # Celery app factory, broker/backend config
│   │       ├── experiment_task.py              # Main experiment execution task (long-running)
│   │       └── firewall_log_task.py            # Async firewall log write task (fire-and-forget)
│   │
│   ├── tests/                                  # Backend test suite
│   │   ├── __init__.py
│   │   ├── conftest.py                         # Shared fixtures (test DB, test client, auth helpers)
│   │   ├── unit/                               # Unit tests (mocked dependencies)
│   │   │   ├── __init__.py
│   │   │   ├── test_auth_service.py
│   │   │   ├── test_provider_service.py
│   │   │   ├── test_project_service.py
│   │   │   ├── test_experiment_service.py
│   │   │   ├── test_judge.py
│   │   │   ├── test_scoring.py
│   │   │   ├── test_encryption.py
│   │   │   ├── test_rate_limiter.py
│   │   │   └── test_api_key.py
│   │   └── integration/                        # Integration tests (real DB, real Redis)
│   │       ├── __init__.py
│   │       ├── test_auth_endpoints.py
│   │       ├── test_provider_endpoints.py
│   │       ├── test_project_endpoints.py
│   │       ├── test_experiment_endpoints.py
│   │       ├── test_results_endpoints.py
│   │       ├── test_feedback_endpoints.py
│   │       └── test_firewall_endpoints.py
│   │
│   ├── alembic.ini                             # Alembic configuration
│   ├── pyproject.toml                          # Python project metadata, dependencies, tool configs
│   ├── requirements.txt                        # Pinned production dependencies
│   ├── requirements-dev.txt                    # Dev/test dependencies (pytest, ruff, mypy)
│   └── Dockerfile                              # Multi-stage build: API server image
│
├── frontend/                                   # React SPA (TypeScript, Vite, MUI v7.3.8)
│   ├── public/                                 # Static assets served as-is
│   │   ├── favicon.ico
│   │   └── robots.txt
│   │
│   ├── src/                                    # Application source
│   │   ├── main.tsx                            # React root render, providers (QueryClient, Theme, Router)
│   │   ├── App.tsx                             # Top-level routing, auth guard, layout selection
│   │   ├── vite-env.d.ts                       # Vite environment type declarations
│   │   │
│   │   ├── pages/                              # One file per route — page-level components
│   │   │   ├── LoginPage.tsx                   # /login — email/password form
│   │   │   ├── RegisterPage.tsx                # /register — registration form
│   │   │   ├── DashboardPage.tsx               # / — project cards, recent experiments, quick stats
│   │   │   ├── ProvidersPage.tsx               # /settings/providers — provider list + add/edit modal
│   │   │   ├── ProjectDetailPage.tsx           # /projects/:id — tabbed view (overview, experiments, firewall, settings)
│   │   │   ├── CreateExperimentPage.tsx        # /projects/:id/experiments/new — multi-step form
│   │   │   ├── ExperimentResultsPage.tsx       # /projects/:id/experiments/:eid — overview dashboard + logs tab
│   │   │   └── FirewallPage.tsx                # /projects/:id/firewall — integration details, log table, stats
│   │   │
│   │   ├── components/                         # Reusable UI components (domain-specific + generic)
│   │   │   ├── common/                         # Generic, domain-agnostic components
│   │   │   │   ├── LoadingScreen.tsx            # Full-page loading skeleton
│   │   │   │   ├── ErrorBoundary.tsx            # React error boundary with fallback UI
│   │   │   │   ├── ConfirmDialog.tsx            # Reusable confirmation modal
│   │   │   │   ├── EmptyState.tsx               # Empty state placeholder with icon + CTA
│   │   │   │   ├── StatusBadge.tsx              # Color-coded status chip (pass/fail/error/running)
│   │   │   │   └── PageHeader.tsx               # Page title + breadcrumb + action buttons
│   │   │   ├── auth/                           # Auth-related components
│   │   │   │   ├── AuthGuard.tsx                # Route protection wrapper (redirect if not authenticated)
│   │   │   │   └── RoleGuard.tsx                # Role-based component visibility
│   │   │   ├── providers/                      # Model provider components
│   │   │   │   ├── ProviderCard.tsx              # Single provider display card
│   │   │   │   └── ProviderFormModal.tsx         # Add/edit provider form modal
│   │   │   ├── projects/                       # Project components
│   │   │   │   ├── ProjectCard.tsx               # Dashboard project summary card
│   │   │   │   ├── CreateProjectModal.tsx        # Multi-step project creation modal
│   │   │   │   ├── ScopeEditor.tsx               # Business scope, allowed/restricted intents editor
│   │   │   │   └── ProjectSettings.tsx           # Project settings panel (name, description, API key)
│   │   │   ├── experiments/                    # Experiment components
│   │   │   │   ├── ExperimentCard.tsx            # Experiment summary card with status badge
│   │   │   │   ├── ExperimentForm/               # Multi-step creation form (directory for sub-steps)
│   │   │   │   │   ├── TypeStep.tsx              # Step 1: Select experiment type
│   │   │   │   │   ├── ConfigStep.tsx            # Step 2: Turn type, testing level, language
│   │   │   │   │   ├── IntegrationStep.tsx       # Step 3: API endpoint, headers, payload, auth
│   │   │   │   │   └── ReviewStep.tsx            # Step 4: Review all config before launch
│   │   │   │   ├── ExperimentProgress.tsx        # Running experiment progress bar + stats
│   │   │   │   └── ExperimentStatusChip.tsx      # Status indicator (pending/running/completed/failed)
│   │   │   ├── results/                        # Results & analytics components
│   │   │   │   ├── OverviewDashboard.tsx         # TPI score, pass rate, error rate, fail impact cards
│   │   │   │   ├── CategoryBreakdown.tsx         # Risk category table with OWASP mapping
│   │   │   │   ├── InsightsPanel.tsx             # AI-generated insights display
│   │   │   │   ├── LogsTable.tsx                 # Paginated, filterable test results table
│   │   │   │   ├── LogDetailPane.tsx             # Resizable side pane with full test detail
│   │   │   │   └── FeedbackButtons.tsx           # Thumbs up/down + correction modal
│   │   │   └── firewall/                       # Firewall components
│   │   │       ├── FirewallIntegration.tsx        # API endpoint, key display, code snippets
│   │   │       ├── FirewallLogTable.tsx           # Firewall evaluation log table
│   │   │       └── FirewallStats.tsx              # Verdict distribution chart, request volume
│   │   │
│   │   ├── services/                           # API client layer (typed, no raw fetch/axios in components)
│   │   │   ├── api.ts                          # Axios instance, interceptors, base URL config
│   │   │   ├── authService.ts                  # login(), register(), refresh(), getMe()
│   │   │   ├── providerService.ts              # getProviders(), createProvider(), updateProvider(), deleteProvider()
│   │   │   ├── projectService.ts               # getProjects(), getProject(), createProject(), updateProject(), deleteProject(), analyzeScope()
│   │   │   ├── experimentService.ts            # getExperiments(), createExperiment(), getStatus(), cancelExperiment()
│   │   │   ├── resultsService.ts               # getResults(), getLogs(), getLogDetail()
│   │   │   ├── feedbackService.ts              # submitFeedback()
│   │   │   └── firewallService.ts              # getFirewallLogs(), getFirewallStats()
│   │   │
│   │   ├── hooks/                              # React Query hooks (one per service domain)
│   │   │   ├── useAuth.ts                      # Login/register mutations, user query
│   │   │   ├── useProviders.ts                 # Provider CRUD queries/mutations
│   │   │   ├── useProjects.ts                  # Project CRUD queries/mutations, scope analysis
│   │   │   ├── useExperiments.ts               # Experiment queries with polling, create/cancel mutations
│   │   │   ├── useResults.ts                   # Results dashboard query, paginated logs query
│   │   │   ├── useFeedback.ts                  # Feedback mutation with optimistic update
│   │   │   └── useFirewall.ts                  # Firewall logs/stats queries
│   │   │
│   │   ├── store/                              # Zustand stores (client-only state)
│   │   │   ├── authStore.ts                    # Auth state: user, token, isAuthenticated, logout
│   │   │   └── uiStore.ts                      # UI state: sidebar open/closed, theme mode
│   │   │
│   │   ├── theme/                              # MUI theme configuration
│   │   │   ├── index.ts                        # createTheme() with custom palette, typography, components
│   │   │   ├── palette.ts                      # Color definitions (primary, secondary, risk-level colors)
│   │   │   ├── typography.ts                   # Font family, sizes, weights
│   │   │   └── components.ts                   # MUI component style overrides (Card, Button, Table, etc.)
│   │   │
│   │   ├── layouts/                            # Page layout wrappers
│   │   │   ├── AuthLayout.tsx                  # Centered card layout for login/register pages
│   │   │   ├── DashboardLayout.tsx             # Sidebar + header + content area (main app layout)
│   │   │   └── MinimalLayout.tsx               # No chrome — used for standalone/embed views
│   │   │
│   │   ├── routes/                             # Route definitions
│   │   │   └── index.tsx                       # React Router route tree, lazy imports, guards
│   │   │
│   │   ├── types/                              # Shared TypeScript type definitions
│   │   │   ├── api.ts                          # API response envelope types
│   │   │   ├── auth.ts                         # User, LoginRequest, RegisterRequest
│   │   │   ├── provider.ts                     # Provider, ProviderCreate, ProviderUpdate
│   │   │   ├── project.ts                      # Project, ProjectCreate, ScopeAnalysis
│   │   │   ├── experiment.ts                   # Experiment, ExperimentConfig, ExperimentStatus
│   │   │   ├── results.ts                      # Dashboard, TestResult, LogEntry, CategoryBreakdown
│   │   │   ├── feedback.ts                     # FeedbackRequest, FeedbackResponse
│   │   │   └── firewall.ts                     # FirewallLog, FirewallStats, Verdict
│   │   │
│   │   └── utils/                              # Utility functions
│   │       ├── formatters.ts                   # Date, number, percentage formatters
│   │       ├── validators.ts                   # Form validation helpers
│   │       └── constants.ts                    # App-wide constants (polling intervals, page sizes, etc.)
│   │
│   ├── index.html                              # Vite HTML entry point
│   ├── vite.config.ts                          # Vite configuration (proxy, build, aliases)
│   ├── tsconfig.json                           # TypeScript configuration
│   ├── tsconfig.node.json                      # TypeScript config for Vite/Node context
│   ├── package.json                            # Dependencies and scripts
│   ├── .eslintrc.cjs                           # ESLint configuration
│   ├── .prettierrc                             # Prettier configuration
│   └── Dockerfile                              # Multi-stage build: nginx serving static bundle
│
├── infra/                                      # Infrastructure & deployment configuration
│   ├── docker/                                 # Docker-specific files
│   │   ├── docker-compose.yml                  # Full stack: api, worker, frontend, postgres, redis, nginx
│   │   ├── docker-compose.dev.yml              # Dev overrides: hot reload, debug ports, local volumes
│   │   ├── nginx/                              # Reverse proxy configuration
│   │   │   ├── nginx.conf                      # Main nginx config (TLS termination, proxy rules)
│   │   │   └── default.conf                    # Server block: /api → backend, / → frontend
│   │   └── postgres/                           # Database initialization
│   │       └── init.sql                        # Initial DB creation script (if not using Alembic for DB creation)
│   ├── env/                                    # Environment variable templates
│   │   ├── .env.example                        # Documented template with all required vars
│   │   ├── .env.development                    # Dev defaults (non-secret)
│   │   └── .env.production                     # Production template (secrets must be injected)
│   └── scripts/                                # Infrastructure automation scripts
│       ├── wait-for-it.sh                      # Wait for service readiness (DB, Redis) before app start
│       └── backup-db.sh                        # PostgreSQL backup script
│
├── docs/                                       # Project documentation
│   ├── PHASE-1-PRODUCT-AND-USER-WORKFLOW.md    # Phase 1 deliverable
│   ├── PHASE-2-SYSTEM-ARCHITECTURE.md          # Phase 2 deliverable
│   ├── PHASE-3-MONOREPO-STRUCTURE.md           # Phase 3 deliverable (this file)
│   └── API.md                                  # API reference documentation (generated later)
│
├── scripts/                                    # Developer workflow scripts
│   ├── setup.sh                                # One-command local dev setup (venv, deps, DB, migrations)
│   ├── setup.ps1                               # Windows equivalent of setup.sh
│   ├── seed.py                                 # Seed database with demo data (admin user, sample project)
│   ├── run-tests.sh                            # Run backend + frontend test suites
│   └── lint.sh                                 # Run linters (ruff + eslint) across entire monorepo
│
├── .gitignore                                  # Git ignore rules (venv, node_modules, .env, __pycache__, dist)
├── .dockerignore                               # Docker ignore rules
├── LICENSE                                     # Project license
└── README.md                                   # Project overview, quickstart, architecture summary
```

---

## Structure Rationale

| Decision | Why |
|---|---|
| **`app/` inside `backend/`** | Separates the Python package from config files (pyproject.toml, Dockerfile). Clean import paths: `from app.core.auth_service import ...` |
| **`api/v1/` namespace** | Allows future API versioning (`v2/`) without breaking existing integrations |
| **`api/schemas/` separate from routes** | Schemas are shared between routes, services, and tests. Co-locating with routes would create circular imports |
| **`core/` for business logic** | Pure domain services with no HTTP or database framework coupling. Testable with mocks. Routes delegate to core; core delegates to repositories |
| **`attacks/strategies/` one file per OWASP category** | Each category has distinct attack patterns, converters, and templates. Isolation prevents a 2,000-line god file |
| **`attacks/templates/` as YAML files** | Templates are data, not code. YAML is human-readable, version-controlled, and easily extended without touching Python |
| **`evaluation/` separate from `attacks/`** | Attack generation and response evaluation are distinct concerns. The judge must be impartial and not coupled to how prompts were generated |
| **`firewall/` separate from `evaluation/`** | Firewall has unique concerns (rate limiting, caching, API key auth) that don't apply to experiment evaluation |
| **`storage/models/` + `storage/repositories/`** | Repository pattern decouples business logic from SQLAlchemy. Services never import SQLAlchemy directly — they call repositories |
| **`security/` as cross-cutting module** | Encryption, JWT, RBAC, API keys, and audit logging are used across all modules. Centralizing prevents duplication |
| **`llm/gateway.py` + `llm/adapters/`** | Adapter pattern: add a new provider by adding one adapter file. Gateway interface stays stable |
| **`workers/` for Celery tasks** | Celery tasks are entry points (like routes), not business logic. They import from `core/`, `attacks/`, and `evaluation/` |
| **Frontend `hooks/` layer** | React Query hooks encapsulate caching, polling, and invalidation logic. Components never call services directly |
| **Frontend `types/` separate from `services/`** | Types are shared between services, hooks, components, and pages. Isolating them prevents circular dependencies |
| **`infra/` at monorepo root** | Infrastructure is not part of either app. It orchestrates both. Keeping it at root makes Docker context clear |
| **`scripts/` at monorepo root** | Developer scripts operate on the whole monorepo, not just backend or frontend |

---

*This structure is now IMMUTABLE. No changes will be made unless explicitly requested.*
