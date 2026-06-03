# 배포 아키텍처

> **프론트:** `https://workspace.bomi.ai.kr` (Vercel)  
> **백엔드 API:** `https://api-workspace.bomi.ai.kr`  
> **로컬 개발:** 프론트 `http://localhost:9000` · API `http://127.0.0.1:9001`

브라우저는 **Vercel에 올라간 Next.js**에서 직접 **FastAPI**를 호출합니다 (`NEXT_PUBLIC_API_BASE_URL` + CORS).

레거시 상대 경로 `/api/*` 가 남아 있으면 Next **`app/api/[[...path]]`** 가 FastAPI `/api/v1/*` 로 프록시합니다. 개별 Route Handler 40+개는 제거되었습니다.

```
[사용자 브라우저]
       │
       ▼
┌──────────────────────┐
│  Vercel (Next.js)    │  NEXT_PUBLIC_API_BASE_URL
│  frontend-next       │ ─────────────────────────────┐
└──────────────────────┘                              │
       │ (정적/SSR 페이지)                              ▼
       │                              ┌──────────────────────────────┐
       │                              │  api-workspace.bomi.ai.kr    │
       │                              │  FastAPI  /api/v1/*          │
       │                              │  PostgreSQL + seed           │
       └──────────────────────────────┴──────────────────────────────┘
```

---

## 1. Vercel (프론트)

**Root Directory:** `frontend-next` (Vercel 프로젝트 설정)

### Environment Variables (Production)

| 변수 | 값 | 비고 |
|------|-----|------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-workspace.bomi.ai.kr` | 끝에 `/` 없음. 경로는 코드에서 `/api/v1/...` |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | 프로덕션은 FastAPI만 사용 |
| `GEMINI_API_KEY` 등 | (선택) | LLM RAG 고도화 시 API 서버로 이전 가능. 기본 챗봇은 FastAPI 규칙 엔진 |

**Preview 배포**도 API를 쓰려면 Preview 환경에도 동일하게 설정하거나, Preview만 mock(`true`)으로 두세요.

### 로컬 (`.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001
NEXT_PUBLIC_USE_MOCK_API=false
```

---

## 2. API 서버 (`api-workspace.bomi.ai.kr`)

**Base path:** `/api/v1` (예: `GET https://api-workspace.bomi.ai.kr/api/v1/dashboard`)

### Environment Variables (서버 `.env`)

템플릿: `backend/.env.production.example`

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST:5432/bomibot
SECRET_KEY=<강한-random-문자열>

# Exact Origin (Vercel 커스텀 도메인 등)
# CORS_ORIGINS=https://your-production-domain.vercel.app

# 기본 true — Preview *.vercel.app, 프론트 *.bomi.ai.kr
CORS_ALLOW_VERCEL_REGEX=true
CORS_ALLOW_BOMI_REGEX=true
TRUSTED_HOSTS=api-workspace.bomi.ai.kr,localhost,127.0.0.1

AUTO_CREATE_TABLES=false
RUN_SEED_ON_STARTUP=false
```

| 항목 | 설명 |
|------|------|
| `CORS_ORIGINS` | **프론트 Exact URL** (선택). regex로 안 잡히는 도메인만 추가 |
| `CORS_ALLOW_VERCEL_REGEX` | `https://*.vercel.app` Preview/Production |
| `CORS_ALLOW_BOMI_REGEX` | `https://*.bomi.ai.kr` (프론트 서브도메인) |
| `CORS_ORIGIN_REGEX` | 위 플래그 대신 직접 regex 지정 시 |
| `TRUSTED_HOSTS` | `Host` 헤더 허용 (미설정 시 프로덕션은 `api-workspace.bomi.ai.kr` 기본) |
| 시드 | 배포 후 1회: `python scripts/seed.py` |
| Health | `GET .../health` → `{"status":"ok","env":"production","database":"ok"}` |
| Chat | `GET/POST /api/v1/chat/config`, `assistant`, `cs-ticket`, `ontology` |
| SMTP | `SMTP_USER`, `SMTP_PASS`, `CS_EMAIL_TO` (CS 티켓 메일) |
| LLM | `GEMINI_API_KEY`, `GEMINI_BASE_URL`, `GEMINI_MODEL` (어시스턴트; 없으면 규칙 엔진) |
| RAG | `RAG_API_URL` (선택), `RAG_TOP_K` (기본 8, 로컬 키워드 검색 폴백) |

### CORS (로컬 vs 배포)

| 환경 | `APP_ENV` | 동작 |
|------|-----------|------|
| 로컬 API | `development` | `localhost:3000`, `127.0.0.1:3000` 등 **자동 허용** + Vercel/bomi regex |
| 배포 API | `production` | `CORS_ORIGINS` + regex (`*.vercel.app`, `*.bomi.ai.kr`) |

로컬 실행: `backend/scripts/run-dev.ps1` 또는 Docker(아래)

템플릿: [backend/.env.production.example](../backend/.env.production.example)

### Docker 배포 (API + PostgreSQL)

```bash
cd backend
cp .env.docker.example .env
# SECRET_KEY, POSTGRES_PASSWORD 수정

# 로컬
docker compose up -d --build

# 프로덕션 서버 (api-workspace.bomi.ai.kr)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec api python scripts/seed.py   # 최초 1회
```

| 파일 | 역할 |
|------|------|
| `backend/Dockerfile` | FastAPI 이미지 |
| `backend/docker-compose.yml` | `api` + `db` (Postgres 16) |
| `backend/docker-compose.prod.yml` | DB 포트 미노출, `APP_ENV=production` |

Nginx는 호스트에서 `127.0.0.1:9001` → 컨테이너 `api` 서비스로 프록시합니다.

### 리버스 프록시 (Nginx 등)

- TLS 종료 후 `uvicorn app.main:app --host 127.0.0.1 --port 9001` (또는 Docker `9001`)
- `X-Forwarded-Proto`, `X-Forwarded-For` 전달 권장

---

## 3. CORS 체크리스트

1. Vercel **Production** 도메인 확인 (예: `https://xxx.vercel.app` 또는 커스텀 도메인)
2. API 서버 `CORS_ORIGINS`에 해당 Origin 추가
3. 브라우저에서 로그인 → Network 탭에 `api-workspace.bomi.ai.kr` 요청이 **200**이고 CORS 오류가 없는지 확인

---

## 4. 연동 확인 순서

1. API: `curl https://api-workspace.bomi.ai.kr/health`
2. 시드 후 로그인:
   ```bash
   curl -X POST https://api-workspace.bomi.ai.kr/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@north.bomi.local","password":"bomi-north-2026","regionId":"chuncheon-north"}'
   ```
3. Vercel에 env 반영 후 재배포
4. 프론트 로그인 · 대시보드 · 칸반 · 챗봇(어시스턴트) 동작 확인
5. 챗봇: `POST /api/v1/chat/assistant` + Bearer + `X-Region-Id`

---

## 5. 관련 문서

- [QUICKSTART.md](../QUICKSTART.md) — 로컬 5분 시작
- [PRODUCTION_BOOTSTRAP.md](./PRODUCTION_BOOTSTRAP.md) — 서버 최초 배포
- [PRODUCTION_SSH_CHECKLIST.md](./PRODUCTION_SSH_CHECKLIST.md) — SSH 단계별 체크리스트
- [VERCEL_ENV.md](./VERCEL_ENV.md) — Vercel env · [env.vercel.production.txt](../frontend-next/env.vercel.production.txt)
- [BACKEND_TODO.md](./BACKEND_TODO.md) — API 이전 진행률
- [backend/README.md](../backend/README.md) — 로컬 실행·시드
- [frontend-next/docs/API_SPEC.md](../frontend-next/docs/API_SPEC.md) — 엔드포인트 명세
- [API_ROUTES.md](./API_ROUTES.md) — FastAPI `/api/v1` 요약
