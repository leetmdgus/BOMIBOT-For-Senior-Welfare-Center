# 프로덕션 서버 최초 배포 (api-workspace.bomi.ai.kr)

Linux 서버 + Docker + Nginx + Vercel 프론트 기준입니다.

**단계별 체크리스트:** [PRODUCTION_SSH_CHECKLIST.md](./PRODUCTION_SSH_CHECKLIST.md)

## 사전 준비

- Docker / Docker Compose v2
- 도메인 DNS → 서버 IP
- TLS 인증서 (Let's Encrypt 권장)
- Vercel Production URL 확정

## 1. 코드 배포

```bash
git clone <repo-url> /opt/bomibot
cd /opt/bomibot/backend
cp .env.docker.example .env
nano .env   # 아래 필수 항목
```

### `.env` 필수 항목

```env
POSTGRES_PASSWORD=<strong-password>
SECRET_KEY=<random-64-chars>
APP_ENV=production

CORS_ORIGINS=https://your-app.vercel.app,https://workspace.bomi.ai.kr
CORS_ALLOW_VERCEL_REGEX=true
CORS_ALLOW_BOMI_REGEX=true
TRUSTED_HOSTS=api-workspace.bomi.ai.kr

RUN_SEED_ON_STARTUP=false
SEED_MISSING_JSON_ON_STARTUP=false
AUTO_CREATE_TABLES=false

GEMINI_API_KEY=...
SMTP_USER=...
SMTP_PASS=...
CS_EMAIL_TO=...
```

## 2. Docker 기동

```bash
chmod +x scripts/deploy-prod.sh scripts/docker-entrypoint.sh
./scripts/deploy-prod.sh
```

또는:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans
```

## 3. DB 스키마 + 시드 (최초 1회)

```bash
./scripts/prod-bootstrap.sh --force --smoke
```

Windows:

```powershell
.\scripts\prod-bootstrap.ps1 -Force -Smoke
```

또는 배포와 한 번에:

```bash
./scripts/deploy-prod.sh && ./scripts/prod-bootstrap.sh --force --smoke
```

## 4. Nginx

템플릿: [nginx-api.example.conf](./nginx-api.example.conf)

```bash
sudo ln -s /opt/bomibot/docs/nginx-api.example.conf /etc/nginx/sites-enabled/bomibot-api
sudo nginx -t && sudo systemctl reload nginx
```

## 5. 헬스·스모크

```bash
curl -s https://api-workspace.bomi.ai.kr/health | jq
curl -s -X POST https://api-workspace.bomi.ai.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@north.bomi.local","password":"bomi-north-2026","regionId":"chuncheon-north"}'
```

## 6. Vercel

[VERCEL_ENV.md](./VERCEL_ENV.md) — env 설정 후 **Redeploy**

## 7. 운영

```bash
# 로그
docker compose logs -f api

# 재배포
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 시드 데이터 갱신 (mock export 후)
# 로컬: cd frontend-next && node scripts/export-region-seed-json.mjs
docker compose exec api python scripts/seed.py --force
```
