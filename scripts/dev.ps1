# BOMIBOT 로컬 개발 스택 (Docker API + 안내)
param(
  [switch]$Frontend,
  [switch]$ResetEnv,
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $repoRoot "backend"
$frontend = Join-Path $repoRoot "frontend-next"

function Test-PortOwner($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conn) {
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.Name -eq "python" -and $proc.Path -notlike "*Docker*") {
      return $proc
    }
  }
  return $null
}

Write-Host "=== BOMIBOT local dev ===" -ForegroundColor Cyan

$pyProc = Test-PortOwner 8020
if ($pyProc) {
  Write-Host "Port 8020: local Python (uvicorn?) PID $($pyProc.Id) — stopping..." -ForegroundColor Yellow
  Stop-Process -Id $pyProc.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Set-Location $backend
$setupArgs = @("-Docker")
if ($ResetEnv) { $setupArgs += "-ResetEnv" }
& "$backend\scripts\setup-local.ps1" @setupArgs

if (-not $SkipDocker) {
  docker compose up -d --build --remove-orphans
  & "$backend\scripts\smoke-test.ps1"
  & "$repoRoot\scripts\verify-stack.ps1"
}

if ($Frontend) {
  Set-Location $frontend
  if (-not (Test-Path "node_modules")) {
    pnpm install
  }
  Write-Host "`nStarting frontend (pnpm dev)..." -ForegroundColor Cyan
  pnpm dev
} else {
  Write-Host @"

API ready: http://127.0.0.1:8020/docs
Frontend:  cd frontend-next && pnpm dev
Or:        .\scripts\dev.ps1 -Frontend
"@ -ForegroundColor Green
}
