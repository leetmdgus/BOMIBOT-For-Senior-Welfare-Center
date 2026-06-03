# api-workspace.bomi.ai.kr 프로덕션 배포 (Windows 서버)
param(
  [switch]$Smoke,
  [switch]$Bootstrap,
  [switch]$ForceSeed
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path ".env")) {
  Write-Error "Copy .env.docker.example to .env and configure secrets first."
}

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans

Start-Sleep -Seconds 10
$port = if ($env:API_PORT) { $env:API_PORT } else { "9001" }
$base = "http://127.0.0.1:$port"

try {
  $health = Invoke-RestMethod -Uri "$base/health"
  Write-Host "Health: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "Health check failed — docker compose logs -f api" -ForegroundColor Red
  exit 1
}

if ($Bootstrap) {
  $bootArgs = @()
  if ($ForceSeed) { $bootArgs += "-Force" }
  if ($Smoke) { $bootArgs += "-Smoke" }
  & "$PSScriptRoot\prod-bootstrap.ps1" @bootArgs
} elseif ($Smoke) {
  & "$PSScriptRoot\smoke-test.ps1" -BaseUrl $base
} else {
  Write-Host @"

First-time on this server:
  .\scripts\prod-bootstrap.ps1 -Force -Smoke

Docs: docs/PRODUCTION_BOOTSTRAP.md
"@
}
