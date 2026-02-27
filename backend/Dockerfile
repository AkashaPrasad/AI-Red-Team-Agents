# ==============================================================================
# Backend Dockerfile — Multi-stage build
# Stages: base → development | production
# ==============================================================================

# --------------------------------------------------------------------------
# Stage 1: Base — shared dependencies
# --------------------------------------------------------------------------
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies required by asyncpg, cryptography, and PyRIT
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --------------------------------------------------------------------------
# Stage 2: Development — includes dev deps, source mounted via volume
# --------------------------------------------------------------------------
FROM base AS development

COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Install watchfiles for Celery hot-reload in dev
RUN pip install --no-cache-dir watchfiles

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --------------------------------------------------------------------------
# Stage 3: Production — minimal image, no dev tools
# --------------------------------------------------------------------------
FROM base AS production

COPY . .

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Run with multiple workers in production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "uvloop", "--http", "httptools"]
