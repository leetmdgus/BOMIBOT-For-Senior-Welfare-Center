# mock JSON export → DB seed (개발 PC에서 실행)
param([switch]$Docker)

$ErrorActionPreference = "Stop"
$backend = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $backend -Parent
$frontend = Join-Path $repoRoot "frontend-next"

Write-Host "Exporting region-store → backend/seed/data ..."
Set-Location $frontend
node scripts/export-region-seed-json.mjs

Write-Host "`nSeeding database ..."
Set-Location $backend
if ($Docker) {
  docker compose exec -T api python scripts/seed.py --force
} else {
  py -3 scripts/seed.py --force
}

Write-Host "Done."
