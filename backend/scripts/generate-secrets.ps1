# 프로덕션용 랜덤 시크릿 생성 (stdout)
param([switch]$WriteEnvExample)

function New-RandomHex([int]$Bytes = 32) {
  $buf = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
  return ([BitConverter]::ToString($buf) -replace '-', '').ToLower()
}

$secret = New-RandomHex 32
$postgres = New-RandomHex 16

Write-Host "SECRET_KEY=$secret"
Write-Host "POSTGRES_PASSWORD=$postgres"
Write-Host ""
Write-Host "Paste into backend/.env then deploy." -ForegroundColor Cyan

if ($WriteEnvExample) {
  $path = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.secrets.generated"
  @(
    "# Generated $(Get-Date -Format o) — do not commit"
    "SECRET_KEY=$secret"
    "POSTGRES_PASSWORD=$postgres"
  ) | Set-Content $path -Encoding utf8
  Write-Host "Wrote $path (gitignored)" -ForegroundColor Yellow
}
