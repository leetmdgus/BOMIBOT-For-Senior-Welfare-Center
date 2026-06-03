# 프로덕션 최초 DB: Alembic + 시드 (Docker compose 실행 중일 때)
param(
  [switch]$Force,
  [switch]$SkipAlembic,
  [switch]$Smoke
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$composeFiles = @("-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")

function Invoke-ApiExec($Args) {
  docker compose @composeFiles exec -T api @Args
}

Write-Host "=== Production DB bootstrap ===" -ForegroundColor Cyan

if (-not $SkipAlembic) {
  Write-Host "alembic upgrade head ..."
  Invoke-ApiExec @("alembic", "upgrade", "head")
}

$seedArgs = @("python", "scripts/seed.py")
if ($Force) { $seedArgs += "--force" } else { $seedArgs += "--missing-json" }

Write-Host "seed: $($seedArgs -join ' ') ..."
Invoke-ApiExec $seedArgs

if ($Smoke) {
<<<<<<< HEAD
  $port = if ($env:API_PORT) { $env:API_PORT } else { "8020" }
=======
  $port = if ($env:API_PORT) { $env:API_PORT } else { "9001" }
>>>>>>> dev2
  & "$PSScriptRoot\smoke-test.ps1" -BaseUrl "http://127.0.0.1:$port"
}

Write-Host "Bootstrap done." -ForegroundColor Green
