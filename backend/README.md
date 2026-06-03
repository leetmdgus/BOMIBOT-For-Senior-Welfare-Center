# BOMIBOT FastAPI Backend

DDD 레이어 구조로 **Vercel(프론트)** + **`https://api-workspace.bomi.ai.kr` (API)** 연동을 위한 백엔드입니다.

<<<<<<< HEAD
배포: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
=======
- 아키텍처 상세: [docs/DDD_ARCHITECTURE.md](../docs/DDD_ARCHITECTURE.md)
- 배포: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
>>>>>>> dev2

```
backend/
├── app/
<<<<<<< HEAD
│   ├── core/                 # 설정, DB, JWT
│   ├── domain/repositories/  # Repository 인터페이스 (포트)
│   ├── application/services/ # 유스케이스
│   ├── infrastructure/
│   │   ├── persistence/      # SQLAlchemy 모델 + Repository 구현
│   │   └── seed/             # mock JSON → DB
│   └── interfaces/api/       # FastAPI 라우터
├── seed/data/                # frontend-next mock에서 export된 JSON
└── scripts/seed.py           # admin + region 시드 CLI
=======
│   ├── core/                      # 설정, DB, JWT
│   ├── domain/                    # Repository 포트, region_store, shared
│   ├── application/               # bounded context별 use-case
│   │   ├── dashboard/             # 대시보드 + live 지표
│   │   ├── region_store/          # JSON gateway, approvals, chat
│   │   └── services/              # auth, kanban, organization, …
│   ├── infrastructure/
│   │   ├── di/container.py        # Composition root (build_container)
│   │   ├── persistence/         # SQLAlchemy
│   │   └── seed/
│   └── interfaces/api/          # FastAPI + deps → container
├── seed/data/
└── scripts/seed.py
>>>>>>> dev2
```

## 스크립트

| 스크립트 | 설명 |
|----------|------|
| `scripts/setup-local.ps1 -Docker` | `.env` + `frontend-next/.env.local` |
| `scripts/smoke-test.ps1` | API 6종 스모크 (로컬/프로덕션 `-BaseUrl`) |
| `scripts/prod-bootstrap.ps1 -Force` | Alembic + 시드 (프로덕션 최초) |
| `scripts/generate-secrets.ps1` | `SECRET_KEY` / `POSTGRES_PASSWORD` 생성 |
| `scripts/list-routes.py` | `/api/v1` 경로 목록 |
| `scripts/migrate.ps1 -Docker` | `alembic upgrade head` |
| `scripts/deploy-prod.ps1 -Bootstrap` | prod compose + bootstrap |

## Docker (권장 — API + PostgreSQL)

```bash
cd backend
cp .env.docker.example .env   # 비밀번호 등 수정
docker compose up -d --build

# POSTGRES_PASSWORD 변경 후 인증 실패 시
.\scripts\reset-docker-stack.ps1
```

`5432 already allocated` 오류 시: 다른 Postgres가 5432를 쓰는 경우입니다. 기본 호스트 포트는 **5433**입니다.  
이전 compose 잔여 컨테이너는 `--remove-orphans` 로 정리하세요.

<<<<<<< HEAD
**8020 포트 충돌:** Docker API와 로컬 `uvicorn`을 동시에 8020에서 띄우지 마세요.  
=======
**9001 포트 충돌:** Docker API와 로컬 `uvicorn`을 동시에 9001에서 띄우지 마세요.  
>>>>>>> dev2
`scripts/smoke-test.ps1` 전에 하나만 실행 (`docker compose down` 또는 로컬 uvicorn 종료).

| 항목 | 값 |
|------|-----|
<<<<<<< HEAD
| API | http://127.0.0.1:8020 |
| Swagger | http://127.0.0.1:8020/docs |
| Health | http://127.0.0.1:8020/health |
=======
| API | http://127.0.0.1:9001 |
| Swagger | http://127.0.0.1:9001/docs |
| Health | http://127.0.0.1:9001/health |
>>>>>>> dev2
| PostgreSQL (호스트) | `localhost:5433` (컨테이너 내부 5432, user/db: `bomibot`) |

```bash
# 로그
docker compose logs -f api

# 시드 재적용
docker compose exec api python scripts/seed.py --force

# 중지
docker compose down
```

**프로덕션 서버** (`api-workspace.bomi.ai.kr`):

```bash
cp .env.docker.example .env
# SECRET_KEY, POSTGRES_PASSWORD 등 설정
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec api python scripts/seed.py   # 최초 1회
```

<<<<<<< HEAD
Nginx가 컨테이너 `8020`으로 프록시하면 됩니다. DB 포트는 `docker-compose.prod.yml`에서 외부 노출하지 않습니다.
=======
Nginx가 컨테이너 `9001`으로 프록시하면 됩니다. DB 포트는 `docker-compose.prod.yml`에서 외부 노출하지 않습니다.
>>>>>>> dev2

## 로컬 실행 (venv, SQLite)

```powershell
cd backend
.\scripts\run-dev.ps1
```

또는:

```bash
copy .env.example .env
pip install -r requirements.txt
python scripts\seed.py
set APP_ENV=development
<<<<<<< HEAD
uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

`APP_ENV=development` 이면 CORS에 **localhost:3000 / 127.0.0.1:3000** 이 자동 포함됩니다.  
프론트 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8020` 과 함께 사용하세요.
=======
uvicorn app.main:app --reload --host 127.0.0.1 --port 9001
```

`APP_ENV=development` 이면 CORS에 **localhost:3000 / 127.0.0.1:3000** 이 자동 포함됩니다.  
프론트 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001` 과 함께 사용하세요.
>>>>>>> dev2

## 프로덕션 실행 (api-workspace.bomi.ai.kr)

```bash
export APP_ENV=production
# .env.production.example 참고
<<<<<<< HEAD
uvicorn app.main:app --host 0.0.0.0 --port 8020 --proxy-headers --forwarded-allow-ips='*'
=======
uvicorn app.main:app --host 0.0.0.0 --port 9001 --proxy-headers --forwarded-allow-ips='*'
>>>>>>> dev2
```

Nginx 뒤에서는 `X-Forwarded-Proto` / `Host` 가 API 도메인으로 전달되어야 합니다.

<<<<<<< HEAD
- Health: `GET http://127.0.0.1:8020/health`
=======
- Health: `GET http://127.0.0.1:9001/health`
>>>>>>> dev2
- API prefix: `/api/v1`

### Admin 계정 (시드)

| 지역 | 이메일 | 비밀번호 |
|------|--------|----------|
| 북부 | admin@north.bomi.local | bomi-north-2026 |
| 동부 | admin@east.bomi.local | bomi-east-2026 |

## Mock → 시드 JSON 재생성

**조직·대시보드·칸반(테이블 시드)** — 기존 one-liner 또는 수동 export.

**region-store 도메인 (JSON store)** — ebooks, files, survey, performance, task-detail, reports, version-history, chat:

```bash
cd frontend-next
node scripts/export-region-seed-json.mjs
cd ../backend
py -3 scripts/seed.py --force
```

`region_json_stores` 테이블에 지역별 payload가 들어갑니다.

```bash
# 기존 DB에 JSON 도메인만 추가 (ontology, chat 등)
py -3 scripts/seed.py --missing-json
```

Docker는 `SEED_MISSING_JSON_ON_STARTUP=true` 시 기동 시 자동 실행합니다.

## Alembic

```bash
cd backend
py -3 -m alembic upgrade head
py -3 -m alembic revision --autogenerate -m "describe change"
```

로컬/Docker는 `AUTO_CREATE_TABLES=true` 와 병행 가능합니다. 프로덕션은 `AUTO_CREATE_TABLES=false` + `alembic upgrade head` 권장.

## `/api/v1` 엔드포인트 요약

| 그룹 | 경로 |
|------|------|
| Auth | `POST /auth/login`, `signup`, `GET /auth/session`, `POST /auth/logout` |
| Dashboard | `GET /dashboard` |
| Organization | `GET /employees` |
| Kanban | `GET/POST /kanban/boards`, tasks CRUD, `staff`, `column-types`, … |
| Task detail | `GET/PATCH /kanban/task-detail/evaluation`, `business-plan`, … |
| Performance | `GET/POST/PUT/DELETE /performance`, `GET /performance/monthly-plan` |
<<<<<<< HEAD
| Survey | `GET/POST /surveys`, `/{id}`, `results`, `responses` |
=======
| Survey | PostgreSQL `surveys` / `survey_responses` — `GET/POST /surveys`, `results`, `responses`, `close`, `duplicate` (JSON 시드 자동 이관) |
>>>>>>> dev2
| Files | `GET/POST/DELETE /files`, `GET /files/manager` |
| Ebooks | `GET/POST /ebooks`, `category-styles`, `suggested-questions` |
| Reports | `GET /reports` |
| Version history | `GET /kanban/version-history`, `POST .../restore` |
| Chat | `GET /chat/config`, `POST /chat/assistant` (RAG+Gemini), `cs-ticket`, `GET /chat/ontology` |
| Legacy tasks | `GET /tasks` |

<<<<<<< HEAD
Swagger: http://127.0.0.1:8020/docs
=======
Swagger: http://127.0.0.1:9001/docs
>>>>>>> dev2

## 프론트 연동

| 환경 | `NEXT_PUBLIC_API_BASE_URL` |
|------|------------------------------|
<<<<<<< HEAD
| 로컬 | `http://127.0.0.1:8020` |
=======
| 로컬 | `http://127.0.0.1:9001` |
>>>>>>> dev2
| Vercel 프로덕션 | `https://api-workspace.bomi.ai.kr` |

공통: `NEXT_PUBLIC_USE_MOCK_API=false`

연동 진행 상황: [docs/BACKEND_TODO.md](../docs/BACKEND_TODO.md)
