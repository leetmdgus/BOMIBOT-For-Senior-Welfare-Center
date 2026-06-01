#!/bin/sh
# 프로덕션 Docker 배포 + 헬스 확인
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Copy .env.docker.example to .env and configure secrets."
  exit 1
fi

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans

echo "Waiting for API..."
sleep 8
curl -fsS "http://127.0.0.1:${API_PORT:-8020}/health" || {
  echo "Health check failed — docker compose logs -f api"
  exit 1
}

echo ""
echo "First-time on this server:"
echo "  ./scripts/prod-bootstrap.sh --force --smoke"
echo ""
