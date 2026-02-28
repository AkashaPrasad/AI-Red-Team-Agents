# AI Red Team Agent

AI Red Team Agent is a self-hosted AI assurance platform for evaluating and protecting LLM applications across their lifecycle, from pre-production testing to production runtime guardrails.

The platform combines:
- Adversarial red teaming aligned to OWASP LLM and agentic risk patterns.
- Behavioral and functional QA for reliability and policy alignment.
- LLM-as-Judge scoring for standardized pass/fail and severity decisions.
- Human feedback workflows for review and continuous quality improvement.
- A production firewall API that evaluates prompts against project scope and risk rules.

## Table of Contents
- [What The Product Does](#what-the-product-does)
- [Core Workflow](#core-workflow)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running The Platform](#running-the-platform)
- [API Overview](#api-overview)
- [Security Model](#security-model)
- [Troubleshooting](#troubleshooting)
- [Project Status](#project-status)
- [Contributing](#contributing)
- [License](#license)

## What The Product Does

AI Red Team Agent helps teams answer a core question: is this AI system safe, reliable, and within scope?

It provides:
- Project-level policy context: business scope, allowed intents, restricted intents.
- Automated experiment generation: adversarial and behavioral test suites tailored to each project.
- Execution against target AI endpoints: single-turn and multi-turn evaluation.
- Standardized analytics: pass/error rates, severity distribution, category breakdowns, and insights.
- Production protection: a firewall verdict API to classify requests as safe, off-topic, policy violation, or restriction attempt.

This is a v1, self-hosted architecture designed for engineering teams running internal AI security and quality programs.

## Core Workflow

1. Configure a model provider (OpenAI / Azure OpenAI).
2. Create a project and define scope boundaries.
3. Launch experiments against your target AI endpoint.
4. Review dashboards and detailed logs.
5. Submit reviewer feedback on representative samples.
6. Integrate firewall endpoint into production traffic flow.
7. Re-run experiments continuously after model or prompt changes.

## Architecture

```text
+---------------------+        +------------------------+
| React Frontend      | <----> | FastAPI Backend        |
| (Vite + MUI + TS)   |        | (REST API, auth, core) |
+---------------------+        +-----------+------------+
                                            |
                                            v
                                +-----------+------------+
                                | Celery Worker(s)       |
                                | Experiment execution   |
                                +-----------+------------+
                                            |
                    +-----------------------+-----------------------+
                    |                                               |
                    v                                               v
          +---------+---------+                           +---------+---------+
          | PostgreSQL        |                           | Redis             |
          | Projects, results,|                           | Broker, cache,    |
          | feedback, audits  |                           | rate limiting     |
          +-------------------+                           +-------------------+
```

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy (async), Alembic, Celery.
- Frontend: React 18, TypeScript, Vite, MUI, React Query, Zustand.
- Data: PostgreSQL, Redis.
- AI/LLM: OpenAI SDK + provider abstraction, PyRIT-based test generation.
- Infra: Docker Compose (dev + production profiles), Nginx for production routing.

## Repository Structure

```text
ai-red-team-agent/
├── backend/        # FastAPI app, models, migrations, worker tasks
├── frontend/       # React SPA
├── infra/          # Docker, env templates, nginx, postgres init
├── scripts/        # Setup scripts and seed utilities
└── docs/           # Architecture and phase-by-phase product docs
```

## Getting Started

### Prerequisites

- Python `3.11.x`
- Node.js `>= 18`
- npm
- Docker + Docker Compose (recommended for Postgres/Redis services)

### Recommended Setup (Linux/macOS)

From repository root:

```bash
bash scripts/setup.sh
```

Then run database migrations and seed data:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
python ../scripts/seed.py
```

Start services in separate terminals:

```bash
# Terminal 1: Backend API
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Terminal 2: Celery worker
cd backend
source venv/bin/activate
celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
```

```bash
# Terminal 3: Frontend
cd frontend
npm run dev
```

### Windows Setup

Use:

```powershell
.\scripts\setup.ps1
```

Then run the same migration, seed, backend, worker, and frontend commands using PowerShell equivalents.

### First Login (Seeded Admin)

Credentials come from your environment values used during seeding:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

If you start from `infra/env/.env.example`, defaults are:
- Email: `admin@example.com`
- Password: `changeme_admin_password`

## Environment Configuration

Primary templates:
- `infra/env/.env.example`
- `infra/env/.env.development`
- `infra/env/.env.production`

For local backend execution, ensure a `.env` is present where backend runs (typically `backend/.env`).

Key variables:
- `DATABASE_URL`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `SUPABASE_URL` (optional metadata/reference)
- `SUPABASE_KEY` (optional metadata/reference)
- `SECRET_KEY`
- `ENCRYPTION_KEY`
- `CORS_ORIGINS`

Generate encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Running The Platform

Default local URLs:
- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

Quick health check:

```bash
curl http://localhost:8000/health
```

## API Overview

Base prefix: `/api/v1`

Key route groups:
- `auth`: login, register, token refresh, current user.
- `organizations`: organization CRUD and context switching.
- `providers`: model provider CRUD and provider validation.
- `projects`: project CRUD, scope analysis, API key regeneration.
- `experiments`: create/list/detail/status/cancel experiment runs.
- `results`: dashboard, logs, and log details per experiment.
- `feedback`: per-test-case reviewer feedback and coverage summaries.
- `firewall`: prompt evaluation endpoint + rules/logs/stats/integration metadata.
- `chat`: provider-backed playground/proxy endpoints.

Example: login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
```

Example: firewall evaluation

```bash
curl -X POST http://localhost:8000/api/v1/firewall/{project_id} \
  -H "Authorization: Bearer {project_api_key}" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"User prompt here","agent_prompt":"Optional system context"}'
```

## Security Model

- Secret handling: provider credentials are encrypted at rest.
- AuthN/AuthZ: JWT-based user authentication with role-aware route guards.
- Project firewall auth: project-scoped API keys for external integrations.
- Auditability: mutation and security-relevant actions logged.
- Rate limiting: Redis-based firewall and API throttling controls.

## Troubleshooting

- `Docker is required` during setup:
  - Required only when using local Postgres/Redis containers. If `DATABASE_URL` points to Supabase and `REDIS_URL` points to Upstash (`rediss://`), setup skips local infra.
- Backend cannot connect to DB:
  - Verify `DATABASE_URL` uses a reachable host and includes `?ssl=require` for Supabase.
- Worker does not pick tasks:
  - Check Upstash/Redis availability and ensure `CELERY_BROKER_URL` matches `REDIS_URL`.
- Frontend cannot call API:
  - Verify backend is on `:8000` and frontend proxy config in `frontend/vite.config.ts`.

## Project Status

- Current maturity: v1 (self-hosted).
- Core capabilities: project/policy management, experiments, analytics, feedback, firewall.
- Reference design and implementation notes: `docs/` phase documents.

## Contributing

1. Create a feature branch.
2. Make focused changes with tests where applicable.
3. Run lint and type checks before opening a PR.
4. Include clear PR descriptions and validation steps.

Suggested local checks:

```bash
# Backend
cd backend
source venv/bin/activate
ruff check app
mypy app
```

```bash
# Frontend
cd frontend
npm run lint
npm run build
```

## License

MIT (see `backend/pyproject.toml`).
