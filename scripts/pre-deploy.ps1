# 배포 전 로컬 점검 + 프로덕션 안내
param(
  [string]$ProdApiUrl = "https://api-workspace.bomi.ai.kr",
  [switch]$SkipLocal,
  [switch]$ProdSmoke
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Write-Host "=== BOMIBOT pre-deploy ===`n" -ForegroundColor Cyan

if (-not $SkipLocal) {
  & "$repoRoot\scripts\verify-stack.ps1"
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "`n--- Production checklist ---" -ForegroundColor Cyan
Write-Host "  docs/PRODUCTION_SSH_CHECKLIST.md"
Write-Host "  frontend-next/env.vercel.production.txt → Vercel env"
Write-Host "  backend: .\scripts\generate-secrets.ps1"

if ($ProdSmoke) {
  Write-Host "`nRemote smoke: $ProdApiUrl" -ForegroundColor Cyan
  & "$repoRoot\backend\scripts\smoke-test.ps1" -BaseUrl $ProdApiUrl
}

Write-Host "`nDone." -ForegroundColor Green
