# BOMIBOT-FRONTEND

봄이봇 **Next.js** 프론트엔드입니다. 개발 서버는 **`frontend-next` 폴더에서만** 실행하세요.

## 배포

| 구분 | URL |
|------|-----|
| 프론트 (Vercel) | `https://workspace.bomi.ai.kr` |
| API (FastAPI) | `https://api-workspace.bomi.ai.kr` |

**로컬 시작:** [QUICKSTART.md](./QUICKSTART.md) · `npm run dev` (루트) · 환경 변수: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 백엔드(FastAPI) 연결 상황

프론트는 `services/*.service.ts` facade에서 mock / API를 분기합니다. FastAPI는 **`backend/`** (DDD)에 있으며, 브라우저가 Vercel 앱에서 API를 **직접** 호출합니다(CORS, Next BFF 프록시 없음).

```
UI (Next.js)
  → services/*.service.ts
       ├─ NEXT_PUBLIC_USE_MOCK_API=true  → *.mock.service → lib/mocks/region-store
       └─ false + NEXT_PUBLIC_API_BASE_URL 설정
            → *.api.service → lib/api-client.ts
                 ├─ (base 없음)     → /api/*  Next catch-all → FastAPI 프록시(선택)
                 └─ (base 있음)     → https://api-workspace.bomi.ai.kr/api/v1/* (권장)
```

| 환경 | API Base URL | 비고 |
|------|----------------|------|
| 로컬 | `http://127.0.0.1:9001` | `backend/scripts/run-dev.ps1` 또는 Docker |
| 프로덕션 | `https://api-workspace.bomi.ai.kr` | Vercel env에 동일 값 설정 |

### 도메인별 연동 현황

| 도메인 | FastAPI | 프론트 `*.api.service` | DB 시드 |
|--------|---------|------------------------|---------|
| Auth, Dashboard, Org, Kanban, Performance, Survey, Files, Ebooks, Reports, Version history, Chat | ✅ `/api/v1/*` | ✅ | ✅ |

레거시 `/api/*` 호출은 `app/api/[[...path]]` catch-all이 FastAPI로 프록시합니다. 브라우저는 **`NEXT_PUBLIC_API_BASE_URL` 직연동**을 권장합니다.

로컬 점검: `.\scripts\verify-stack.ps1` · 프로덕션 최초 DB: `backend/scripts/prod-bootstrap.ps1 -Force`

### 프론트에서 FastAPI 켜기

`frontend-next/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9001
NEXT_PUBLIC_USE_MOCK_API=false
```

프로덕션(Vercel):

```env
NEXT_PUBLIC_API_BASE_URL=https://api-workspace.bomi.ai.kr
NEXT_PUBLIC_USE_MOCK_API=false
```

공통 HTTP 클라이언트: `frontend-next/lib/api-client.ts` (`Authorization`, `X-Region-Id`, `resolveApiPath`)

### 백엔드 실행 · 시드

**Docker (권장):**

```bash
cd backend
cp .env.docker.example .env
docker compose up -d --build --remove-orphans
# API http://127.0.0.1:9001/health
```

**venv (SQLite):**

```powershell
cd backend
.\scripts\run-dev.ps1
.\.venv\Scripts\python.exe scripts\seed.py
```

상세: [backend/README.md](./backend/README.md)

| 지역 | Admin 이메일 | 비밀번호 |
|------|--------------|----------|
| 북부 | `admin@north.bomi.local` | `bomi-north-2026` |
| 동부 | `admin@east.bomi.local` | `bomi-east-2026` |

### 관련 문서

| 문서 | 내용 |
|------|------|
| [backend/README.md](./backend/README.md) | DDD 구조, uvicorn, 시드 재생성 |
| [docs/BACKEND_TODO.md](./docs/BACKEND_TODO.md) | 도메인별 체크리스트(진행률) |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Vercel + CORS + 프로덕션 env |
| [docs/VERCEL_ENV.md](./docs/VERCEL_ENV.md) | Vercel Environment Variables |
| [frontend-next/docs/API_SPEC.md](./frontend-next/docs/API_SPEC.md) | REST 명세 |
| [frontend-next/docs/DATABASE_SCHEMA.md](./frontend-next/docs/DATABASE_SCHEMA.md) | PostgreSQL ERD |

## 실행 (Next.js)

```powershell
cd frontend-next
npm install
npm run dev
```

- 기본 `dev`는 **Webpack** 모드 + Node 힙 **8GB** (`--max-old-space-size=8192`)  
- Turbopack이 OOM 나면 Webpack을 쓰세요. Turbopack이 필요하면: `npm run dev:turbo`

브라우저: **http://localhost:9000**

메모리 부족이 계속되면:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run dev
```

그리고 `C:\Users\hyun\package-lock.json` 같은 **상위 홈 lockfile** 이 있으면 Next workspace 를 잘못 잡을 수 있습니다. 가능하면 제거하거나, 반드시 `frontend-next` 에서만 실행하세요.

## 주의 — Vite 프로젝트와 분리

저장소 안의 `Bomi-Slot-document-automatation/` 은 **별도 Vite 앱**입니다.

| 구분 | 경로 | dev 명령 |
|------|------|----------|
| **봄이봇 (이 프로젝트)** | `frontend-next/` | `npm run dev` → Next |
| 문서 자동화 (참고용) | `Bomi-Slot-document-automatation/Bomi-Slot-document-automatation-frontend/` | `npm run dev` → Vite |

`Bomi-Slot-document-automatation-frontend` 에서 `npm run dev` 를 켠 뒤 같은 포트로 접속하면 브라우저가 `/@vite/client`, `/@react-refresh` 를 요청합니다. **Next 오류가 아니라 Vite 서버에 접속한 것**입니다.

## Next 진입점 (App Router)

- `frontend-next/app/layout.tsx`
- `frontend-next/app/page.tsx`
- `frontend-next/app/kanban/page.tsx`
- `frontend-next/app/kanban/task/[id]/business-plan/page.tsx` 등

`index.html`, `src/main.tsx`, `vite.config.*` 는 **frontend-next에 없음** — 있으면 제거 대상입니다.

## lockfile 경고

상위 폴더(`C:\Users\hyun\package-lock.json` 등)에 다른 lockfile 이 있으면 Next가 workspace root 를 잘못 잡을 수 있습니다. `frontend-next/next.config.mjs` 에 `turbopack.root` 가 설정되어 있습니다.
