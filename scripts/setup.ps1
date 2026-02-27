# ==============================================================================
# Local Development Setup Script (Windows PowerShell)
# Usage: .\scripts\setup.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AI Red Team Agent — Local Dev Setup"       -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# --- Check prerequisites ---
Write-Host "`n[1/7] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python 3.11 is required. Install it first."
    exit 1
}
$pyVersion = python --version 2>&1
if ($pyVersion -notmatch "3\.11") {
    Write-Warning "Python 3.11 recommended. Found: $pyVersion"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required. Install it first."
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required. Install it first."
    exit 1
}
Write-Host "  ✓ Python, Node.js, Docker found" -ForegroundColor Green

# --- Backend virtual environment ---
Write-Host "`n[2/7] Creating Python virtual environment..." -ForegroundColor Yellow

Push-Location "$RootDir\backend"
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Virtual environment already exists" -ForegroundColor Green
}

& ".\venv\Scripts\Activate.ps1"

# --- Install backend dependencies ---
Write-Host "`n[3/7] Installing backend dependencies..." -ForegroundColor Yellow

pip install --upgrade pip -q 2>$null
pip install -r requirements-dev.txt -q 2>$null
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green

Pop-Location

# --- Frontend dependencies ---
Write-Host "`n[4/7] Installing frontend dependencies..." -ForegroundColor Yellow

Push-Location "$RootDir\frontend"
if (Test-Path "package.json") {
    npm ci --silent 2>$null
    if ($LASTEXITCODE -ne 0) { npm install --silent 2>$null }
    Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No package.json found — skipping (will be created in later phase)" -ForegroundColor Yellow
}
Pop-Location

# --- Environment file ---
Write-Host "`n[5/7] Setting up environment file..." -ForegroundColor Yellow

Push-Location $RootDir
if (-not (Test-Path ".env")) {
    Copy-Item "infra\env\.env.example" ".env"

    # Generate Fernet encryption key
    $FernetKey = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    (Get-Content ".env") -replace "ENCRYPTION_KEY=", "ENCRYPTION_KEY=$FernetKey" | Set-Content ".env"

    # Generate secret key
    $SecretKey = python -c "import secrets; print(secrets.token_urlsafe(48))"
    (Get-Content ".env") -replace "SECRET_KEY=changeme_generate_a_64_char_random_string", "SECRET_KEY=$SecretKey" | Set-Content ".env"

    Write-Host "  ✓ .env created with generated keys" -ForegroundColor Green
} else {
    Write-Host "  ✓ .env already exists" -ForegroundColor Green
}
Pop-Location

# --- Start infrastructure ---
Write-Host "`n[6/7] Starting PostgreSQL and Redis..." -ForegroundColor Yellow

Push-Location "$RootDir\infra\docker"
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
Write-Host "  ✓ PostgreSQL and Redis started" -ForegroundColor Green
Pop-Location

# --- Wait for services ---
Write-Host "`n[7/7] Waiting for services to be ready..." -ForegroundColor Yellow

Write-Host "  Waiting for PostgreSQL..."
$retries = 0
do {
    Start-Sleep -Seconds 1
    $retries++
    $ready = docker exec art-postgres pg_isready -U postgres 2>$null
} while ($LASTEXITCODE -ne 0 -and $retries -lt 30)
Write-Host "  ✓ PostgreSQL ready" -ForegroundColor Green

Write-Host "  Waiting for Redis..."
$retries = 0
do {
    Start-Sleep -Seconds 1
    $retries++
    docker exec art-redis redis-cli ping 2>$null | Out-Null
} while ($LASTEXITCODE -ne 0 -and $retries -lt 30)
Write-Host "  ✓ Redis ready" -ForegroundColor Green

# --- Done ---
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!"                               -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. cd backend; .\venv\Scripts\Activate.ps1"
Write-Host "    2. alembic upgrade head          # Run migrations"
Write-Host "    3. python ..\scripts\seed.py     # Seed admin user"
Write-Host "    4. uvicorn app.main:app --reload # Start API server"
Write-Host ""
Write-Host "  Frontend:"
Write-Host "    1. cd frontend"
Write-Host "    2. npm run dev                   # Start Vite dev server"
Write-Host ""
