# 로컬 개발 환경 파일 생성
param(
  [switch]$Docker,
  [switch]$Sqlite,
  [switch]$ResetEnv
)

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $backendRoot -Parent
Set-Location $backendRoot

if ($Docker) {
  if ($ResetEnv -and (Test-Path ".env")) {
    Copy-Item ".env" ".env.backup" -Force
    Write-Host "Backed up .env → .env.backup" -ForegroundColor Yellow
  }
  if (-not (Test-Path ".env") -or $ResetEnv) {
    Copy-Item ".env.docker.example" ".env"
    Write-Host "Created backend/.env from .env.docker.example" -ForegroundColor Green
    Write-Host "  → SECRET_KEY, GEMINI_API_KEY 등을 수정하세요."
    if ($ResetEnv) {
      Write-Host "  POSTGRES_PASSWORD를 바꿨다면: .\scripts\reset-docker-stack.ps1" -ForegroundColor Yellow
    }
  } else {
    Write-Host "backend/.env exists — Docker compose reads this file." -ForegroundColor Yellow
    Write-Host "  Re-sync template: .\scripts\setup-local.ps1 -Docker -ResetEnv"
  }
}

if ($Sqlite) {
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.docker.local.example" ".env"
    Write-Host "Created backend/.env (SQLite) from .env.docker.local.example" -ForegroundColor Green
  }
}

if (-not $Docker -and -not $Sqlite) {
  Write-Host "Usage: .\scripts\setup-local.ps1 -Docker   # docker compose"
  Write-Host "       .\scripts\setup-local.ps1 -Sqlite  # uvicorn + bomi.db"
  exit 0
}

$frontendEnv = Join-Path $repoRoot "frontend-next\.env.local"
$frontendExample = Join-Path $repoRoot "frontend-next\.env.local.example"

if (-not (Test-Path $frontendEnv)) {
  Copy-Item $frontendExample $frontendEnv
  Write-Host "Created frontend-next/.env.local" -ForegroundColor Green
} else {
  Write-Host "frontend-next/.env.local already exists (skipped)" -ForegroundColor Yellow
}

Write-Host "`nNext:"
if ($Docker) {
  Write-Host "  cd backend"
  Write-Host "  docker compose up -d --build"
  Write-Host "  .\scripts\smoke-test.ps1"
}
if ($Sqlite) {
  Write-Host "  cd backend"
  Write-Host "  .\scripts\run-dev.ps1"
}
Write-Host "  cd frontend-next && pnpm dev"
