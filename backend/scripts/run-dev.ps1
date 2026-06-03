# 로컬 SQLite + uvicorn (Docker 없이)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

<<<<<<< HEAD
$portInUse = Get-NetTCPConnection -LocalPort 8020 -ErrorAction SilentlyContinue
if ($portInUse) {
  Write-Host "Port 8020 is in use. Stop Docker API or other uvicorn first:" -ForegroundColor Yellow
=======
$portInUse = Get-NetTCPConnection -LocalPort 9001 -ErrorAction SilentlyContinue
if ($portInUse) {
  Write-Host "Port 9001 is in use. Stop Docker API or other uvicorn first:" -ForegroundColor Yellow
>>>>>>> dev2
  Write-Host "  docker compose down"
  Write-Host "  Or change API_PORT in .env for Docker"
  exit 1
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.docker.local.example" ".env"
  Write-Host "Created .env from .env.docker.local.example"
}

py -3 -m pip install -r requirements.txt -q
py -3 scripts/seed.py --missing-json

<<<<<<< HEAD
Write-Host "Starting uvicorn on http://127.0.0.1:8020 ..."
$env:APP_ENV = "development"
py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
=======
Write-Host "Starting uvicorn on http://127.0.0.1:9001 ..."
$env:APP_ENV = "development"
py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 9001
>>>>>>> dev2
