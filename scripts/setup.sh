#!/usr/bin/env bash
# ==============================================================================
# Local Development Setup Script (Linux/macOS)
# Usage: bash scripts/setup.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  AI Red Team Agent — Local Dev Setup"
echo "============================================"

# --- Check prerequisites ---
echo ""
echo "[1/7] Checking prerequisites..."

command -v python3.11 >/dev/null 2>&1 || { echo "ERROR: Python 3.11 is required. Install it first."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required. Install it first."; exit 1; }
echo "  ✓ Python 3.11 and Node.js found"

# --- Backend virtual environment ---
echo ""
echo "[2/7] Creating Python virtual environment..."

cd "$ROOT_DIR/backend"
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
    echo "  ✓ Virtual environment created"
else
    echo "  ✓ Virtual environment already exists"
fi

source venv/bin/activate

# --- Install backend dependencies ---
echo ""
echo "[3/7] Installing backend dependencies..."

pip install --upgrade pip -q
pip install -r requirements-dev.txt -q
echo "  ✓ Backend dependencies installed"

# --- Frontend dependencies ---
echo ""
echo "[4/7] Installing frontend dependencies..."

cd "$ROOT_DIR/frontend"
npm ci --silent 2>/dev/null || npm install --silent
echo "  ✓ Frontend dependencies installed"

# --- Environment file ---
echo ""
echo "[5/7] Setting up environment file..."

cd "$ROOT_DIR"
if [ ! -f ".env" ]; then
    cp infra/env/.env.example .env
    # Generate encryption key
    FERNET_KEY=$(python3.11 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|ENCRYPTION_KEY=|ENCRYPTION_KEY=${FERNET_KEY}|" .env
    else
        sed -i "s|ENCRYPTION_KEY=|ENCRYPTION_KEY=${FERNET_KEY}|" .env
    fi
    # Generate secret key
    SECRET=$(python3.11 -c "import secrets; print(secrets.token_urlsafe(48))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|SECRET_KEY=changeme_generate_a_64_char_random_string|SECRET_KEY=${SECRET}|" .env
    else
        sed -i "s|SECRET_KEY=changeme_generate_a_64_char_random_string|SECRET_KEY=${SECRET}|" .env
    fi
    echo "  ✓ .env created with generated keys"
else
    echo "  ✓ .env already exists"
fi

# --- Start infrastructure ---
echo ""
echo "[6/7] Starting PostgreSQL and Redis (if local)..."

cd "$ROOT_DIR"
DATABASE_URL_VALUE="$(grep -E '^DATABASE_URL=' .env | tail -n 1 | cut -d '=' -f2- || true)"
REDIS_URL_VALUE="$(grep -E '^REDIS_URL=' .env | tail -n 1 | cut -d '=' -f2- || true)"

START_POSTGRES=true
START_REDIS=true

if [[ "$DATABASE_URL_VALUE" == *"supabase.co"* ]]; then
    START_POSTGRES=false
fi
if [[ "$REDIS_URL_VALUE" == rediss://* || "$REDIS_URL_VALUE" == *"upstash.io"* ]]; then
    START_REDIS=false
fi

SERVICES=()
if [[ "$START_POSTGRES" == true ]]; then
    SERVICES+=("postgres")
fi
if [[ "$START_REDIS" == true ]]; then
    SERVICES+=("redis")
fi

if [ ${#SERVICES[@]} -gt 0 ]; then
    command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required for local postgres/redis setup. Install Docker or use external URLs in .env."; exit 1; }
    cd "$ROOT_DIR/infra/docker"
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d "${SERVICES[@]}"
    echo "  ✓ Started local services: ${SERVICES[*]}"
else
    echo "  ✓ External PostgreSQL/Redis detected in .env, skipping local Docker services"
fi

# --- Wait for services ---
echo ""
echo "[7/7] Waiting for services to be ready..."

if [[ "$START_POSTGRES" == true ]]; then
    echo "  Waiting for PostgreSQL..."
    until docker exec art-postgres pg_isready -U postgres -q 2>/dev/null; do
        sleep 1
    done
    echo "  ✓ PostgreSQL ready"
fi

if [[ "$START_REDIS" == true ]]; then
    echo "  Waiting for Redis..."
    until docker exec art-redis redis-cli ping -q 2>/dev/null; do
        sleep 1
    done
    echo "  ✓ Redis ready"
fi

if [[ "$START_POSTGRES" == false && "$START_REDIS" == false ]]; then
    echo "  ✓ No local services to wait for"
fi

# --- Done ---
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  Next steps:"
echo "    1. cd backend && source venv/bin/activate"
echo "    2. alembic upgrade head          # Run migrations"
echo "    3. python ../scripts/seed.py     # Seed admin user"
echo "    4. uvicorn app.main:app --reload # Start API server"
echo ""
echo "  Frontend:"
echo "    1. cd frontend"
echo "    2. npm run dev                   # Start Vite dev server"
echo ""
