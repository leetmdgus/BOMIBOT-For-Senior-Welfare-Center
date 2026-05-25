#!/bin/sh
set -e
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--docker" ]; then
  docker compose exec -T api alembic upgrade head
else
  alembic upgrade head
fi
echo "Migration complete."
