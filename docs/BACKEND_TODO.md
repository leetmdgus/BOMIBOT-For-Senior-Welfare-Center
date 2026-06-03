# FastAPI 백엔드 연동 TODO

> **구조:** `backend/app` — DDD (domain → application → infrastructure → interfaces)  
> **시드:** `python scripts/seed.py` (프론트 `lib/mocks/*` → `backend/seed/data/*.json`)  
> **프로덕션 API:** `https://api-workspace.bomi.ai.kr` · **프론트:** Vercel  
<<<<<<< HEAD
> **로컬 API:** `http://127.0.0.1:8020/api/v1`  
=======
> **로컬 API:** `http://127.0.0.1:9001/api/v1`  
>>>>>>> dev2
> **Docker:** `cd backend && docker compose up -d --build --remove-orphans`  
> 배포 상세: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 0. 인프라 · 공통

- [x] FastAPI 프로젝트 스캐폴드 (`backend/`, DDD 레이어)
- [x] SQLAlchemy 모델 (regions, users, departments, employees, dashboard, kanban)
- [x] Domain Repository 인터페이스
- [x] SQLAlchemy Repository 구현
- [x] Admin 시드 (`scripts/seed.py` — 북부/동부 admin + mock JSON)
- [x] Docker (`Dockerfile`, `docker-compose.yml`, Postgres 호스트 **5433**)
- [x] CORS 로컬 + Vercel/bomi regex (`app/core/cors.py`)
- [x] Alembic 스캐폴드 (`backend/alembic/`, `alembic upgrade head`)
- [x] Alembic Docker 이미지 포함 + `RUN_ALEMBIC_ON_STARTUP` (prod compose)
- [ ] 프로덕션 서버 최초 `prod-bootstrap` / 배포 검증 (운영)
- [x] 프로덕션 배포 가이드 — [PRODUCTION_BOOTSTRAP.md](./PRODUCTION_BOOTSTRAP.md), Nginx 예시
- [ ] PostgreSQL 프로덕션 서버 실제 배포·시드 1회 (운영)
- [x] GitHub Actions `api-smoke.yml` · `frontend-build.yml`
- [x] Vercel → FastAPI 직연동 문서 — [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 1. Repository · Router · 프론트 연동

| 도메인 | Repository | Router | 프론트 `*.api.service` | Next `app/api` 제거 |
|--------|:----------:|:------:|:----------------------:|:-------------------:|
| Auth | x | x `/api/v1/auth/*` | x | [x] catch-all 프록시 |
| Dashboard | x | x `/api/v1/dashboard` | x | [x] |
| Organization | x | x `/api/v1/employees` | x | [x] |
| Kanban boards | x | x `/api/v1/kanban/*` | x | [x] |
| Kanban task-detail | x (JSON store) | x `/api/v1/kanban/task-detail/*` | x | [x] |
| Performance | x (JSON store) | x `/api/v1/performance/*` | x | [x] |
| Survey | x (JSON store) | x `/api/v1/surveys/*` | x | [x] |
| Files / Files manager | x (JSON store) | x `/api/v1/files/*` | x | [x] |
| Ebooks | x (JSON store) | x `/api/v1/ebooks/*` | x | [x] |
| Reports | x (JSON store) | x `/api/v1/reports` | x | [x] |
| Chat / CS | x (RAG + Gemini LLM + SMTP) | x `/api/v1/chat/*` | x | [x] |
| Version history | x (JSON store) | x `/api/v1/kanban/version-history/*` | x | [x] |

### Kanban FastAPI 엔드포인트 (완료)

- `GET/POST /api/v1/kanban/boards`
- `PATCH/DELETE /api/v1/kanban/boards/{id}/...`
- `POST/PATCH/DELETE .../categories/{id}/tasks/...`
- `GET /api/v1/kanban/staff`, `column-types`, `task-path-map`, `project-image-options`
- `GET /api/v1/kanban/categories/column-type?title=`

---

## 2. 시드 데이터 (admin + region-store)

- [x] Regions, Admin users
- [x] Organization, Dashboard, Kanban projects
- [x] Survey, files, ebooks, performance, task-detail, version-history, chat config (`region_json_stores`)
- [x] 시드 CLI: `--force` (전체), `--missing-json` (JSON 도메인만)
- [x] Docker `SEED_MISSING_JSON_ON_STARTUP` + entrypoint

---

## 3. Next.js → FastAPI 이전 (`app/api/**`)

| 단계 | 상태 |
|------|------|
| 개별 Route Handler 40+ | [x] 제거 → `app/api/[[...path]]` FastAPI 프록시 |
| 모든 도메인 | [x] FastAPI `/api/v1/*` |
| Mock 모드 | [x] `*.mock.service` (챗봇 클라이언트 규칙 엔진) |

<<<<<<< HEAD
`NEXT_PUBLIC_USE_MOCK_API=false` + `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020`
=======
`NEXT_PUBLIC_USE_MOCK_API=false` + `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001`
>>>>>>> dev2

---

## 4. Vercel · `api-workspace.bomi.ai.kr`

- [x] 배포 문서화
- [x] Vercel env 문서 — [VERCEL_ENV.md](./VERCEL_ENV.md) (대시보드 적용은 수동)
- [x] 프로덕션 bootstrap 스크립트 (`scripts/prod-bootstrap.ps1` / `.sh`)
- [ ] API 서버 Docker/prod env + `prod-bootstrap.ps1 -Force` 1회 (운영 서버에서 실행)

---

## 5. 로컬 실행

```powershell
# repo 루트 — Docker API + 포트 정리
.\scripts\dev.ps1
```

```bash
cd backend
docker compose up -d --build --remove-orphans
<<<<<<< HEAD
# http://127.0.0.1:8020/health
=======
# http://127.0.0.1:9001/health
>>>>>>> dev2
```

프론트 `frontend-next/.env.local`:

```env
<<<<<<< HEAD
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020
=======
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001
>>>>>>> dev2
NEXT_PUBLIC_USE_MOCK_API=false
```
