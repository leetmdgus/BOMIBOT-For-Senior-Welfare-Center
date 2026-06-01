# 로컬 스택 점검 (Docker API + 프론트 env)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $repoRoot "backend"
$frontend = Join-Path $repoRoot "frontend-next"
$base = "http://127.0.0.1:8020"

$ok = $true

function Fail($msg) {
  Write-Host "[FAIL] $msg" -ForegroundColor Red
  $script:ok = $false
}

function Pass($msg) {
  Write-Host "[OK] $msg" -ForegroundColor Green
}

Write-Host "=== BOMIBOT stack verify ===`n" -ForegroundColor Cyan

$api = docker ps --filter "name=bomibot-api" --format "{{.Status}}" 2>$null
if ($api -match "healthy|Up") {
  Pass "Docker bomibot-api: $api"
} else {
  Fail "bomibot-api not running — cd backend && docker compose up -d"
}

try {
  $health = Invoke-RestMethod "$base/health" -TimeoutSec 5
  if ($health.database -eq "ok") {
    Pass "GET /health (db=$($health.database), llm=$($health.llm))"
  } else {
    Fail "GET /health database=$($health.database)"
  }
} catch {
  Fail "GET /health — $($_.Exception.Message)"
}

$envLocal = Join-Path $frontend ".env.local"
if (Test-Path $envLocal) {
  $content = Get-Content $envLocal -Raw
  if ($content -match "NEXT_PUBLIC_API_BASE_URL\s*=\s*http://127\.0\.0\.1:8020") {
    Pass "frontend .env.local → 127.0.0.1:8020"
  } else {
    Fail ".env.local missing NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020"
  }
  if ($content -match "NEXT_PUBLIC_USE_MOCK_API\s*=\s*false") {
    Pass "frontend USE_MOCK_API=false"
  } else {
    Write-Host "[WARN] NEXT_PUBLIC_USE_MOCK_API not false" -ForegroundColor Yellow
  }
} else {
  Fail "frontend-next/.env.local missing — run backend\scripts\setup-local.ps1 -Docker"
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  Write-Host "[WARN] node_modules missing — pnpm install" -ForegroundColor Yellow
}

if ($ok) {
  Write-Host "`nAll checks passed. Run: cd frontend-next && pnpm dev" -ForegroundColor Green
  exit 0
}
Write-Host "`nFix issues above, then: .\scripts\dev.ps1" -ForegroundColor Yellow
exit 1
