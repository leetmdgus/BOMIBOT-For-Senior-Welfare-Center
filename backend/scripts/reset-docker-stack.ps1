# Postgres 볼륨 삭제 후 스택 재기동 (.env 비밀번호 변경 시 필요)
param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not $Force) {
  Write-Host "This removes the Postgres volume (all local DB data)." -ForegroundColor Yellow
  $answer = Read-Host "Continue? [y/N]"
  if ($answer -notmatch '^[yY]') {
    Write-Host "Cancelled."
    exit 0
  }
}

docker compose down -v --remove-orphans
docker compose up -d --build --remove-orphans
Write-Host "Waiting for API..." -ForegroundColor Cyan
Start-Sleep -Seconds 12
& "$PSScriptRoot\smoke-test.ps1"
