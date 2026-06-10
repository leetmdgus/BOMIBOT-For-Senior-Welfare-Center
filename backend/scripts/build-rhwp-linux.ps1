# rhwp 리눅스 amd64 바이너리 빌드 → backend/bin/rhwp
#
# 백엔드 Docker 이미지(.hwp/.hwpx SVG 미리보기)에 COPY 되는 산출물을 만든다.
# 호스트가 Windows 라 rust 컨테이너 안에서 리눅스 바이너리를 컴파일한다.
# rhwp 소스(repo 루트 rhwp/)가 바뀔 때만 다시 실행하면 된다. (LTO 릴리즈, 수 분 소요)
#
# 사용: backend/scripts/build-rhwp-linux.ps1   그 다음   docker compose up -d --build

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$rhwp = Join-Path $repo "rhwp"
$out  = Join-Path $repo "backend\bin"

if (-not (Test-Path (Join-Path $rhwp "Cargo.toml"))) {
    throw "rhwp 소스를 찾을 수 없습니다: $rhwp (Cargo.toml 없음)"
}
New-Item -ItemType Directory -Force $out | Out-Null

Write-Host "rhwp 리눅스 바이너리 빌드 중... (LTO 릴리즈, 수 분 소요)"
# CARGO_TARGET_DIR 를 컨테이너 임시 경로로 두어 호스트 rhwp/target(Windows 산출물)을 건드리지 않는다.
docker run --rm `
  -v "${rhwp}:/src" `
  -v "${out}:/out" `
  -e CARGO_TARGET_DIR=/tmp/t `
  -w /src `
  rust:latest `
  bash -c "cargo build --release --bin rhwp && cp /tmp/t/release/rhwp /out/rhwp && chmod +x /out/rhwp && ls -l /out/rhwp"

if ($LASTEXITCODE -ne 0) { throw "rhwp 빌드 실패 (exit $LASTEXITCODE)" }
Write-Host "완료: $out\rhwp"
