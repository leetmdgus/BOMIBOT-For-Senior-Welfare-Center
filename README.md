# BOMIBOT

> **최종 갱신:** 2026-06-08

## 배포

| 구분 | URL |
|------|-----|
| 프론트 (Vercel) | `https://workspace.bomi.ai.kr` |

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

### 도메인별 연동 현황

| 도메인 | FastAPI | 프론트 `*.api.service` | DB 시드 |
|--------|---------|------------------------|---------|
| Auth, Dashboard, Org, Kanban, Performance, Survey, Files, Ebooks, Reports, Version history, Chat | ✅ `/api/v1/*` | ✅ | ✅ |
| 문서자동화(HWPX), 양식 자동작성(document-templates) | ✅ `/api/v1/automation/*`, `/api/v1/document-templates/*` | ✅ | ✅ |

> 문서자동화/양식 미리보기는 **rhwp(Rust) SVG 렌더러**를 사용합니다. AI 자동 채움은 `GEMINI_API_KEY` 필요. rhwp 미설치 시 근사 렌더러로 폴백 — 배포 주의는 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) §5 참고.

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

## 개발 구조 (아키텍처)

프론트는 **칸반 보드 → 업무 상세(task-detail) → 문서(HWPX)** 흐름이 핵심이고, 백엔드는 현재 `hwpx-editor` 브랜치에서 **HWPX 문서 생성·편집·렌더링**을 담당합니다.

### 프론트 — 서비스 Facade 공통 패턴

UI는 데이터를 직접 부르지 않고 **`services/*.service.ts` facade**를 통합니다. facade가 `shouldUseMockApi()`로 mock/API를 분기합니다.

```
UI 컴포넌트
  → services/<domain>.service.ts            # mock / API 분기
       ├─ <domain>.mock.service.ts          # lib/mocks/region-store (인메모리)
       └─ <domain>.api.service.ts           # lib/api-client.ts → FastAPI
            └─ lib/api-get-cache.ts          # GET 캐시 + in-flight 중복제거
```

`lib/api-get-cache.ts` 의 `cachedApiGet`(기본 TTL 45초, staff/이미지 120초)는 `regionId:token` 스코프로 캐시하고, 변경 후 `invalidateApiGetCache("kanban")` 로 무효화합니다.

### 프론트 — 칸반 보드 (사업관리)

진입점 `app/kanban/page.tsx` → 컴포넌트 계층:

```
KanbanBoardPage   components/kanban/board/kanban-board-page.tsx
  · year/검색 sessionStorage 유지, 협업(WebSocket kanbanRoom) 라이브 갱신
  · 콜드로드 최적화: getProjects/staff/이미지/접근범위를 Promise.all 병렬 로드
└ ProjectSection   board/project-section.tsx
    · @dnd-kit DndContext, handleDragEnd 에서 낙관적 업데이트 → moveTask() → 실패 시 롤백
  └ KanbanColumn   board/kanban-column.tsx   # 4컬럼: 실적관리·사업계획·만족도조사·사업평가
    └ TaskCard     board/task-card.tsx       # useSortable, 카드 클릭 → /kanban/task/[id]
```

- 서비스: `services/kanban.board.{service,api.service,mock.service,types}.ts`
- 접근제어: `lib/kanban/project-access.ts` (관리자=전체, 팀장=팀 사업, 팀원=배정 task만) → `filterProjectsByAssignee`
- 검색/필터: `lib/kanban/filter-kanban-projects.ts`

### 프론트 — 업무 상세 (task-detail)

`app/kanban/task/[id]` → 기본 `/survey` 리다이렉트. `layout.tsx` 가 sticky 헤더 + 4탭 네비(`task-detail-tabs.tsx`) 제공.

| 탭 | 라우트 | 컴포넌트 |
|----|--------|----------|
| 실적관리 | `performance/` (plan·actual·input·result) | `performance/performance-workspace.tsx` + `PerformanceProvider` |
| 사업계획서 | `business-plan/` | `business-plan-tab.tsx` |
| 만족도조사 | `survey/` | `satisfaction-survey-tab.tsx` (QR 생성) |
| 사업평가 | `evaluation/` | `business-evaluation-tab.tsx` |

- **실적 상태**: `performance-provider.tsx` — `PerformanceRow[]`(월별 계획/실적 인원·횟수·예산), undo/redo, 추경 스냅샷, 집계
- **자동저장**: 계획/평가 탭 700ms 디바운스 + 스냅샷 비교, 저장 후 `invalidateApiGetCache("task-detail:<id>")`
- **실적→계획/평가 자동연동**: `lib/kanban/load-performance-sub-project-names.ts` (세부사업명·예산·횟수 채움)
- **협업**: `taskBusinessPlanRoom` / `taskEvaluationRoom` (WebSocket) — draft 디바운스 동기화 + presence
- **HWPX 문서자동화**: `hwpx-template-selector.tsx` 로 양식 선택 → `prefillDocumentTemplate`(폼값 자동채움) → WYSIWYG 편집 → `exportFilledTemplate`(.hwpx 다운로드). 자동화 작업은 `lib/automation/automation-draft.ts` 로 **IndexedDB 임시저장**(F5 복구), 완료 시 `/files`에 업무 연결로 저장

### 백엔드 — HWPX 에디터 (`hwpx-editor` 브랜치)

모듈은 `backend/app/application/hwpx/` 에 있습니다.

| 모듈 | 책임 |
|------|------|
| `render/service.py` | **메인 렌더 서비스** — 템플릿→file_json→폼바인딩→HWPX + HTML 미리보기, 참조표 grafting, 폰트 통일 |
| `render/hwpx_json.py`·`json_tree.py` | HWPX ZIP(section0/header/settings.xml) ↔ JSON 트리 (네임스페이스·tail 보존) |
| `render/apply_form.py`·`*_table_ops.py` | 폼 데이터를 표 셀 좌표맵으로 바인딩 |
| `render/render_json_builder.py`·`html_preview.py` | JSON 트리 → render_json → HTML+CSS (DOM 근사) |
| `render/byte_pack.py` | 다운로드용 최종 HWPX 조립 (section0 바이트 치환 + PrvText 동기화) |
| `render/custom_template_fill.py` | 업로드 템플릿: **라벨 매칭**(사업명→projectName)으로 인접 셀 채움 |
| `hwpx_image_embed.py` | 이미지 임베드 — `hp:pic` 생성, header.xml binDataList / content.hpf 패치 |
| `ai_fill.py` | **Gemini 자동채움** (빈 셀 수집→AI 제안, `GEMINI_API_KEY`) |
| `rhwp_render.py` | **rhwp(Rust) CLI → 페이지별 SVG** 렌더 어댑터 |
| `task_hwpx_sync.py` | 계획/평가 저장 시 HWPX 생성 → 파일스토어 업로드(업무 연결) |
| `automation/section0_writeback.py` | 편집 JSON → **section0.xml만 교체** (원본 메타/이미지 보존 라운드트립) |

**(역)직렬화 파이프라인**

```
다운로드:  폼 → file_json → 표 바인딩 → section0 바이트 치환(+PrvText 동기화) → HWPX
편집:      업로드 HWPX → frontendJson → UI 편집 → section0.xml만 교체 → HWPX
미리보기:  HWPX → render_json → HTML (DOM 근사)   또는   rhwp CLI → SVG (정밀)
```

> **설계 핵심**: 다운로드 시 lxml 재직렬화를 피하고 section0 바이트만 치환 + PrvText를 바이트 길이까지 동기화 → 한글 오피스 "손상" 경고 방지.

**API**

| 라우터 | 주요 엔드포인트 |
|--------|------------------|
| `interfaces/api/v1/document_templates.py` | `GET/POST/DELETE /document-templates`, `POST .../{id}/prefill`, `.../{id}/export` |
| `interfaces/api/v1/task_detail.py` | `GET/PATCH .../business-plan`·`.../evaluation`, `POST .../business-plan/hwpx`(+`/preview`), `.../evaluation/hwpx`(+`/preview`), `.../evaluation/complete` |
| `interfaces/api/v1/automation.py` | `POST /hwpx/parse`·`/hwpx/export`·`/hwpx/render-svg`·`/hwpx/ai-fill`, `/documents/analyze` |

### rhwp 정밀 렌더러 (별도 Rust 저장소 `rhwp/`)

문서 미리보기는 `rhwp`(Rust + WASM HWP/HWPX 렌더러)가 만든 **페이지별 SVG**로 표시됩니다.

- 프론트 `components/hwpx/HwpxSvgPreview.tsx`: 편집 변경 시 500ms 디바운스로 `renderHwpxSvg(file, doc)` → 백엔드 `POST /automation/hwpx/render-svg` → 편집 JSON을 원본에 writeback 후 rhwp 렌더
- **폴백**: rhwp 미가용/오류(503/422) 시 DOM 근사 렌더러 `HwpxRenderer` 로 자동 폴백 → 항상 표시
- 바이너리 탐색: `RHWP_BIN` env → PATH → `rhwp/target/{release,debug}/rhwp` (`backend/app/core/config.py` 의 `rhwp_bin`)
- **프로덕션 주의**: Docker 이미지에 rhwp 바이너리 빌드 스테이지가 없으면 SVG 정밀 렌더가 비활성화되어 DOM 폴백만 동작합니다.

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
