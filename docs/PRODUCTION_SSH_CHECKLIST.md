# 프로덕션 SSH 배포 체크리스트

`api-workspace.bomi.ai.kr` + Vercel 프론트 기준. 순서대로 진행하세요.

---

## A. 서버 준비

- [ ] Ubuntu 22.04+ (또는 동급 Linux)
- [ ] Docker Engine + Compose v2 설치
- [ ] DNS: `api-workspace.bomi.ai.kr` → 서버 공인 IP
- [ ] 방화벽: **80, 443** 허용 (SSH는 본인 IP만 권장)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## B. 코드 & 환경

```bash
sudo mkdir -p /opt/bomibot
sudo chown $USER:$USER /opt/bomibot
git clone <REPO_URL> /opt/bomibot
cd /opt/bomibot/backend
cp .env.docker.example .env
nano .env
```

### `.env` 필수 (프로덕션)

| 변수 | 예시 |
|------|------|
| `APP_ENV` | `production` |
| `POSTGRES_PASSWORD` | 강한 비밀번호 |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `CORS_ORIGINS` | Vercel Production URL (쉼표 구분) |
| `TRUSTED_HOSTS` | `api-workspace.bomi.ai.kr` |
| `RUN_SEED_ON_STARTUP` | `false` |
| `AUTO_CREATE_TABLES` | `false` |
| `GEMINI_API_KEY` | (선택) 챗봇 LLM |
| `SMTP_*`, `CS_EMAIL_TO` | (선택) CS 메일 |

비밀번호 생성 (로컬 PC):

```powershell
cd backend
.\scripts\generate-secrets.ps1
```

---

## C. Docker 기동

```bash
chmod +x scripts/*.sh scripts/docker-entrypoint.sh
./scripts/deploy-prod.sh
```

Windows 서버:

```powershell
.\scripts\deploy-prod.ps1
```

---

## D. DB (최초 1회)

프로덕션 compose는 기동 시 **`RUN_ALEMBIC_ON_STARTUP=true`** 로 `alembic upgrade head` 를 자동 실행합니다.

```bash
./scripts/prod-bootstrap.sh --force --smoke
# 또는 시드만: docker compose exec api python scripts/seed.py --force
```

---

## E. Nginx + TLS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp /opt/bomibot/docs/nginx-api.example.conf /etc/nginx/sites-available/bomibot-api
sudo ln -sf /etc/nginx/sites-available/bomibot-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d api-workspace.bomi.ai.kr
sudo systemctl reload nginx
```

---

## F. API 검증

```bash
curl -s https://api-workspace.bomi.ai.kr/health
# {"status":"ok","database":"ok","llm":true,...}

curl -s -X POST https://api-workspace.bomi.ai.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@north.bomi.local","password":"bomi-north-2026","regionId":"chuncheon-north"}'
```

로컬 PC에서:

```powershell
cd backend
.\scripts\smoke-test.ps1 -BaseUrl https://api-workspace.bomi.ai.kr
```

---

## G. Vercel

1. Root Directory: **`frontend-next`**
2. Environment Variables → [vercel-env.production.txt](../frontend-next/env.vercel.production.txt) 내용 복사
3. **Redeploy** (env만 바꿔도 재배포 필요)

---

## H. E2E 확인

- [ ] https://(프론트 도메인)/login — 북부 admin 로그인
- [ ] Network: `api-workspace.bomi.ai.kr/api/v1/dashboard` → **200**
- [ ] 칸반 · 설문 · 파일 · 챗봇 어시스턴트
- [ ] CORS 오류 없음 (있으면 API `CORS_ORIGINS`에 프론트 URL 추가)

---

## I. 운영 명령

```bash
cd /opt/bomibot/backend
docker compose logs -f api
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

시드/mock 갱신:

```bash
# 개발 PC에서 export 후 git push, 서버에서:
docker compose exec api python scripts/seed.py --force
```

---

## 문제 해결

| 증상 | 조치 |
|------|------|
| `password authentication failed` | `.env` `POSTGRES_PASSWORD` ≠ 볼륨 생성 시 비밀번호 → `docker compose down -v` 후 재기동 (데이터 삭제 주의) |
| CORS | `CORS_ORIGINS` + `CORS_ALLOW_*_REGEX` 확인 |
| 502 Bad Gateway | `docker ps`, `curl http://127.0.0.1:8020/health` |
| 챗봇 규칙만 | `GEMINI_API_KEY` + `/health` `llm: true` |

관련: [PRODUCTION_BOOTSTRAP.md](./PRODUCTION_BOOTSTRAP.md) · [VERCEL_ENV.md](./VERCEL_ENV.md)
