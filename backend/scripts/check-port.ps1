# 8020 포트 점유 확인 — 로컬 uvicorn + Docker 동시 점유 시 exit 1
param([int]$Port = 8020)

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Host "Port $Port is free."
  exit 0
}

$pythonListeners = @()
foreach ($c in $listeners) {
  $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
  $name = if ($proc) { "$($proc.ProcessName) (PID $($proc.Id))" } else { "PID $($c.OwningProcess)" }
  Write-Host "  $($c.LocalAddress):$Port — $name"
  if ($proc -and $proc.Name -eq "python") {
    $pythonListeners += $proc
  }
}

if ($pythonListeners.Count -gt 0) {
  Write-Host "`nWARN: local Python on $Port — stop uvicorn or use .\scripts\dev.ps1" -ForegroundColor Yellow
  exit 1
}

exit 0
