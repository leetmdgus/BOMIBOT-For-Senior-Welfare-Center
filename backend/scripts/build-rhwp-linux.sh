#!/usr/bin/env bash
# rhwp 리눅스 amd64 바이너리 빌드 → backend/bin/rhwp
#
# 백엔드 Docker 이미지(.hwp/.hwpx SVG 미리보기)에 COPY 되는 산출물을 만든다.
# rhwp 소스(repo 루트 rhwp/)가 바뀔 때만 다시 실행하면 된다. (LTO 릴리즈, 수 분 소요)
#
# 사용: backend/scripts/build-rhwp-linux.sh   그 다음   docker compose up -d --build
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
rhwp="$repo/rhwp"
out="$repo/backend/bin"

[ -f "$rhwp/Cargo.toml" ] || { echo "rhwp 소스를 찾을 수 없습니다: $rhwp" >&2; exit 1; }
mkdir -p "$out"

echo "rhwp 리눅스 바이너리 빌드 중... (LTO 릴리즈, 수 분 소요)"
if command -v cargo >/dev/null 2>&1; then
  # 리눅스 호스트: 네이티브 cargo 로 바로 빌드 (rhwp CLAUDE.md 권장)
  ( cd "$rhwp" && CARGO_TARGET_DIR="$rhwp/target" cargo build --release --bin rhwp )
  cp "$rhwp/target/release/rhwp" "$out/rhwp"
else
  # cargo 없으면 rust 컨테이너로 빌드
  docker run --rm \
    -v "$rhwp:/src" -v "$out:/out" -e CARGO_TARGET_DIR=/tmp/t -w /src \
    rust:latest \
    bash -c "cargo build --release --bin rhwp && cp /tmp/t/release/rhwp /out/rhwp"
fi
chmod +x "$out/rhwp"
ls -l "$out/rhwp"
echo "완료: $out/rhwp"
