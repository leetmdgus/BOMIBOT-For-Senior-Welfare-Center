# FastAPI 스모크 테스트 — http://127.0.0.1:9001
param(
  [string]$BaseUrl = "http://127.0.0.1:9001",
  [switch]$AllowUnreachable,
  [string]$Email = "admin@north.bomi.local",
  [string]$Password = "bomi-north-2026",
  [string]$RegionId = "chuncheon-north"
)

$ErrorActionPreference = "Stop"

function Test-Endpoint($Name, $ScriptBlock) {
  try {
    & $ScriptBlock
    Write-Host "[OK] $Name" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[FAIL] $Name — $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

Write-Host "Smoke test: $BaseUrl`n"

$uri = [uri]$BaseUrl
if ($uri.Host -in @("127.0.0.1", "localhost")) {
  $port = if ($uri.Port -gt 0) { $uri.Port } else { 9001 }
  & "$PSScriptRoot\check-port.ps1" -Port $port 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Port conflict — fix before relying on smoke results.`n" -ForegroundColor Yellow
  }
}

try {
  $health = Invoke-RestMethod "$BaseUrl/health" -TimeoutSec 15
} catch {
  Write-Host "[FAIL] Cannot reach $BaseUrl/health — $($_.Exception.Message)" -ForegroundColor Red
  if ($BaseUrl -match "api-workspace") {
    Write-Host "  Production API may not be deployed yet. See docs/PRODUCTION_SSH_CHECKLIST.md" -ForegroundColor Yellow
  }
  if (-not $AllowUnreachable) { exit 1 }
  exit 0
}
Write-Host "Health: $($health | ConvertTo-Json -Compress)"
if ($health.llm -eq $false) {
  Write-Host "  (llm=false — GEMINI_API_KEY in backend/.env for gateway LLM)" -ForegroundColor DarkGray
}

$loginBody = @{
  email    = $Email
  password = $Password
  regionId = $RegionId
} | ConvertTo-Json

$session = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST `
  -ContentType "application/json" -Body $loginBody

$headers = @{
  Authorization = "Bearer $($session.token)"
  "X-Region-Id" = $RegionId
}

# CORS preflight (브라우저 직연동 시)
try {
  $cors = Invoke-WebRequest -Uri "$BaseUrl/api/v1/dashboard" -Method OPTIONS `
    -Headers @{
      Origin                        = "http://localhost:3000"
      "Access-Control-Request-Method" = "GET"
    } -UseBasicParsing
  if ($cors.Headers["Access-Control-Allow-Origin"]) {
    Write-Host "[OK] OPTIONS /api/v1/dashboard (CORS)" -ForegroundColor Green
  }
} catch {
  Write-Host "[WARN] CORS preflight — $($_.Exception.Message)" -ForegroundColor Yellow
}

$passed = 0
$total = 0

$tests = @(
  @{ Name = "GET /api/v1/dashboard"; Block = { Invoke-RestMethod "$BaseUrl/api/v1/dashboard" -Headers $headers | Out-Null } },
  @{ Name = "GET /api/v1/kanban/boards"; Block = { Invoke-RestMethod "$BaseUrl/api/v1/kanban/boards?year=2026" -Headers $headers | Out-Null } },
  @{ Name = "GET /api/v1/ebooks"; Block = { Invoke-RestMethod "$BaseUrl/api/v1/ebooks" -Headers $headers | Out-Null } },
  @{ Name = "GET /api/v1/surveys"; Block = { Invoke-RestMethod "$BaseUrl/api/v1/surveys" -Headers $headers | Out-Null } },
  @{ Name = "GET /api/v1/chat/config"; Block = { Invoke-RestMethod "$BaseUrl/api/v1/chat/config" -Headers $headers | Out-Null } },
  @{
    Name  = "POST /api/v1/chat/assistant"
    Block = {
      $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(
        '{"message":"dashboard summary"}'
      )
      $r = Invoke-RestMethod -Uri "$BaseUrl/api/v1/chat/assistant" -Method POST -Headers $headers `
        -ContentType "application/json; charset=utf-8" -Body $bodyBytes
      if (-not $r.answer) { throw "empty answer" }
    }
  }
)

foreach ($t in $tests) {
  $total++
  if (Test-Endpoint $t.Name $t.Block) { $passed++ }
}

Write-Host "`nResult: $passed / $total passed"
if ($passed -lt $total) { exit 1 }
