# BOMIBOT 로컬 Quickstart

## 1. 한 번에 (권장)

```powershell
# repo 루트
.\scripts\dev.ps1
# 프론트까지: .\scripts\dev.ps1 -Frontend
```

`.env`의 `POSTGRES_PASSWORD`를 바꾼 뒤 DB가 안 붙으면:

```powershell
cd backend
.\scripts\reset-docker-stack.ps1   # 볼륨 삭제 후 재기동
```

## 1b. 백엔드만 (Docker)

```powershell
cd backend
.\scripts\setup-local.ps1 -Docker -ResetEnv   # .env ← docker 템플릿
docker compose up -d --build --remove-orphans
.\scripts\smoke-test.ps1
```

API: http://127.0.0.1:8020/docs

## 2. 프론트

```powershell
cd frontend-next
copy .env.local.example .env.local
pnpm install
pnpm clean:next   # app/api → FastAPI 이전 후 stale 캐시 제거
pnpm dev
```

http://localhost:3000 — 로그인:

| 지역 | 이메일 | 비밀번호 |
|------|--------|----------|
| 북부 | admin@north.bomi.local | bomi-north-2026 |
| 동부 | admin@east.bomi.local | bomi-east-2026 |

## 2b. 점검

```powershell
.\scripts\verify-stack.ps1
```

## 3. 주의

- **8020 포트 하나만** — Docker API와 로컬 `uvicorn` 동시 실행 금지 (`.\scripts\dev.ps1`가 uvicorn 정리)
- **`POSTGRES_PASSWORD` 변경** — `backend\scripts\reset-docker-stack.ps1`
- mock만 쓰려면 `NEXT_PUBLIC_USE_MOCK_API=true` (API 불필요)

## 4. 프로덕션 배포

- API 서버: [docs/PRODUCTION_SSH_CHECKLIST.md](./docs/PRODUCTION_SSH_CHECKLIST.md)
- Vercel env: [frontend-next/env.vercel.production.txt](./frontend-next/env.vercel.production.txt)
- 배포 전: `.\scripts\pre-deploy.ps1` · 원격 스모크: `npm run smoke:prod`
- DB 마이그레이션: `npm run migrate` (Docker)

## 문서

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel + 프로덕션
- [docs/VERCEL_ENV.md](docs/VERCEL_ENV.md) — Vercel env
- [docs/PRODUCTION_BOOTSTRAP.md](docs/PRODUCTION_BOOTSTRAP.md) — 서버 최초 배포
- [docs/PRODUCTION_SSH_CHECKLIST.md](docs/PRODUCTION_SSH_CHECKLIST.md) — SSH 체크리스트
- [docs/BACKEND_TODO.md](docs/BACKEND_TODO.md) — 진행 체크리스트
