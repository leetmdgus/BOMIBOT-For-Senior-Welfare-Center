#!/bin/sh
set -e

echo "[entrypoint] APP_ENV=${APP_ENV:-development}"

if [ -n "${DATABASE_URL}" ] && echo "${DATABASE_URL}" | grep -q "postgresql"; then
  echo "[entrypoint] Waiting for PostgreSQL..."
  python <<'PY'
import os
import sys
import time

from sqlalchemy import create_engine, text

url = os.environ["DATABASE_URL"]
engine = create_engine(url, pool_pre_ping=True)

for attempt in range(60):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[entrypoint] PostgreSQL is ready")
        sys.exit(0)
    except Exception as exc:
        print(f"[entrypoint] DB not ready ({attempt + 1}/60): {exc}")
        time.sleep(2)

print("[entrypoint] PostgreSQL wait timeout", file=sys.stderr)
sys.exit(1)
PY
fi

if [ "${RUN_ALEMBIC_ON_STARTUP}" = "true" ]; then
  echo "[entrypoint] Running alembic upgrade head..."
  alembic upgrade head || {
    echo "[entrypoint] Alembic failed" >&2
    exit 1
  }
fi

if [ "${RUN_SEED_ON_STARTUP}" = "true" ]; then
  echo "[entrypoint] Running seed..."
  python scripts/seed.py || echo "[entrypoint] Seed skipped or already applied"
fi

if [ "${SEED_MISSING_JSON_ON_STARTUP}" = "true" ]; then
  echo "[entrypoint] Seeding missing JSON domains..."
  python scripts/seed.py --missing-json || true
fi

PLAN_HWPX="/app/app/common/hwpx/templates/render/plan.hwpx"
EVAL_HWPX="/app/app/common/hwpx/templates/render/evaluation.hwpx"
if [ ! -s "$PLAN_HWPX" ] || [ ! -s "$EVAL_HWPX" ]; then
  echo "[entrypoint] ERROR: HWPX render templates missing ($PLAN_HWPX)" >&2
  echo "[entrypoint] Rebuild image after: scripts/sync_hwpx_render_templates.sh" >&2
  exit 1
fi

echo "[entrypoint] Starting: $*"
exec "$@"
