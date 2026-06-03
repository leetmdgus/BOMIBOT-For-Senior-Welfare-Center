#!/bin/sh
# HWPX_TEMPLATES → render 번들 (ex_대목차+본문.hwpx 참고 표 내장 후 복사)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python "$ROOT/scripts/sync_hwpx_render_templates.py"
