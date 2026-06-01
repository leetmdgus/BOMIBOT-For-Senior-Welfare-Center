# Alembic upgrade (로컬 venv 또는 Docker)
param([switch]$Docker)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if ($Docker) {
  docker compose exec -T api alembic upgrade head
} else {
  py -3 -m alembic upgrade head
}

Write-Host "Migration complete." -ForegroundColor Green
