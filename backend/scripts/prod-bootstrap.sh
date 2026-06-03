#!/bin/sh
# 프로덕션 최초 DB: Alembic + 시드
set -e
cd "$(dirname "$0")/.."

FORCE=""
SKIP_ALEMBIC=""
SMOKE=""
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --skip-alembic) SKIP_ALEMBIC=1 ;;
    --smoke) SMOKE=1 ;;
  esac
done

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "=== Production DB bootstrap ==="

if [ -z "$SKIP_ALEMBIC" ]; then
  echo "alembic upgrade head ..."
  $COMPOSE exec -T api alembic upgrade head
fi

if [ -n "$FORCE" ]; then
  $COMPOSE exec -T api python scripts/seed.py --force
else
  $COMPOSE exec -T api python scripts/seed.py --missing-json
fi

if [ -n "$SMOKE" ]; then
<<<<<<< HEAD
  curl -fsS "http://127.0.0.1:${API_PORT:-8020}/health"
=======
  curl -fsS "http://127.0.0.1:${API_PORT:-9001}/health"
>>>>>>> dev2
fi

echo "Bootstrap done."
