# BOMIBOT Frontend 코드 리뷰 (FastAPI 연동 직전)

> **최종 갱신:** 2026-06-08 (본문은 2026-05-19 *연동 직전 시점 스냅샷* — 현황은 [SERVICES_API_MAP.md](../../docs/SERVICES_API_MAP.md)·[BACKEND_TODO.md](../../docs/BACKEND_TODO.md) 참고)  
> **기준 문서:** [API_SPEC.md](./API_SPEC.md)  
> 목표 백엔드: **FastAPI**  
> 범위: 프론트엔드·목업·Service·Next.js interim API.
>
> ⚠️ **이후 진행:** 이 리뷰가 가리키던 P0/P1 항목 다수가 완료되었습니다 — 공통 `api-client.ts` 구현, FastAPI `/api/v1` 전 도메인 연동, **문서자동화(HWPX/rhwp)·양식 자동작성·AI 자동 채움** 신규 추가. 아래 "❌ 미구현"의 `automation = Coming Soon`은 더 이상 유효하지 않습니다(현재 구현됨).

---

## 1. 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| Service 계층 (mock / api / facade) | ✅ | 15개+ 도메인 facade 존재 |
| `lib/mocks` 분리 | ✅ | 도메인별 mock 파일 정리됨 |
| Next.js `/api/*` interim 라우트 | ✅ | 34개 route (조회·일부 mutation) |
| 컴포넌트 → Service 연결 | ⚠️ **약 85%** | 신규 UI 다수 추가, 일부는 mock 직접 import |
| FastAPI 공통 HTTP 클라이언트 | ❌ | `api-client.ts` 미구현 |
| API 명세 | ✅ | [API_SPEC.md](./API_SPEC.md) 갱신됨 (CS·설문·평가·문서 포함) |

**결론:** 칸반·대시보드·설문·사업문서·CS 챗봇·사업평가 등 **화면 단위 기능**은 목업으로 데모 가능합니다. FastAPI 연동 전에는 **공통 API 클라이언트**, **실적·파일 mutation 영속화**, **사업계획 탭·실적 요약 API 분리**, **레거시 정리**가 필요합니다.

---

## 2. 최근 완료된 기능 (이전 리뷰 대비)

| 영역 | 완료 내용 |
|------|-----------|
| **실적관리** | 서브 탭 UI 전환(입력관리/사업계획/실적/결과), 입력관리 시트(NAS·업로드·추경·실적 모달), `PerformanceProvider` |
| **실적 요약 시트** | `performance-summary-view` — 월·원천 필터, 행 드릴다운, 세부사업명/상세분류 토글 (목업 직접 로드) |
| **사업문서** | `/kanban/documents` 단일 페이지 + 탭 전환, 실적/예산/사업계획서 테이블 |
| **만족도조사** | `/survey/*` — `survey.service` + API, 에디터·미리보기·결과·저장 |
| **사업평가** | `get/save/completeBusinessEvaluation`, 함께보기 패널, 섹션 추가·스크롤 |
| **CS 챗봇** | CS·데이터 탭, SMTP 메일(`lib/chat/cs-email`), `POST /api/chat/cs-ticket` |
| **데이터 챗봇** | 온톨로지 그래프 + Gemini/규칙, `POST /api/chat/assistant`, 서브그래프 UI |
| **버전 기록** | `kanban.version-history.service` + API |

---

## 3. 현재 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  app/ + components/                                       │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│  *.service.ts (facade)                                    │
│  NEXT_PUBLIC_USE_MOCK_API=true  → *.mock.service        │
│  else                           → *.api.service → /api/* │
└───────────────┬─────────────────────┬───────────────────┘
                │                     │
                ▼                     ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│ lib/mocks/*.mock.ts   │   │ app/api/**/route.ts         │
│ (일부 컴포넌트 직접   │   │ → mock.service (서버)       │
│  import ⚠️)            │   └─────────────────────────────┘
└───────────────────────┘              │
                            (목표)     ▼
                            ┌─────────────────────────────┐
                            │ FastAPI /api/v1             │
                            └─────────────────────────────┘
```

### 환경 변수

| 변수 | 현재 | 용도 |
|------|------|------|
| `NEXT_PUBLIC_USE_MOCK_API` | `true` (일반) | 브라우저에서 mock service 직접 호출 |

| 변수 (연동 시 권장) | 용도 |
|---------------------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 프로덕션: `https://api-workspace.bomi.ai.kr` · 로컬: `http://127.0.0.1:9001` ([DEPLOYMENT.md](../../docs/DEPLOYMENT.md)) |
| `NEXT_PUBLIC_USE_MOCK_API` | `false` 시 `*.api.service` → FastAPI |

---

## 4. 도메인별 연결 현황

### ✅ Service 연결 완료

| 도메인 | Facade | Next API | 주요 UI |
|--------|--------|----------|---------|
| 대시보드 | `dashboard.service` | `GET /api/dashboard` | `dashboard-page` |
| 조직 | `organization.service` | `GET /api/employees` | `organization-page` |
| 전자책 | `ebooks.service` | `GET/POST /api/ebooks` | `ebooks-page` |
| 파일 | `files.service` | `GET /api/files`, `/manager` | `use-file-manager` (초기 로드) |
| 칸반 보드 | `kanban.board.service` | `/api/kanban/boards/*` | `kanban-board-page`, CRUD |
| 버전 기록 | `kanban.version-history.service` | `/api/kanban/version-history` | `version-history-sheet` |
| 업무 상세·설문 목록 | `kanban.task-detail.service` | `/api/kanban/task-detail/surveys` | `satisfaction-survey-tab` |
| 사업평가 | `kanban.task-detail.service` | evaluation GET/PATCH/complete | `business-evaluation-tab` |
| 실적 입력 | `kanban.performance.service` | `GET /api/performance?scope=input-management` | `input-management-tab` |
| 월별 계획 API | `kanban.performance.service` | `GET /api/performance/monthly-plan` | **UI 미사용** (아래 TODO) |
| 사업문서 | `kanban.documents.service` | `GET /api/reports` | `documents-workspace` |
| 글로벌 설문 | `survey.service` | `/api/surveys`, `/api/surveys/{id}` | `survey-detail-page`, editor, results |
| 챗봇 (CS·데이터·온톨로지) | `chat.service` | `/api/chat/*` | `chatbot.tsx` (layout) |

### ⚠️ 부분 연결 / 설계 이슈

| 항목 | 문제 |
|------|------|
| **사업계획 탭 (실적)** | `MontlyPanView`가 `getMonthlyPlan` 대신 `performance-summary.mock` 직접 사용. 추경·월별계획 API와 UI 불일치 |
| **사업실적·사업결과 탭** | `performance-summary-view`가 mock 직접 import — Service·API 레이어 우회 |
| **실적 입력 저장** | `input-management-tab` 저장 버튼 → 엑셀 다운로드 수준, `POST/PUT /api/performance` mock 비영속 |
| **칸반 DnD** | 업무 이동 시 로컬 state만, `updateTask` 미호출 가능성 |
| **파일 관리** | CRUD는 로컬 state, API POST/DELETE 비영속 |
| **전자책 api** | `getCategoryStyles`, `getSuggestedQuestions`가 API 모드에서 mock dynamic import |
| **사업계획서 탭 (업무상세)** | `business-plan-tab.tsx` — `sections`·`formData` 하드코딩, service 없음 |
| **조직 mock** | 부서·직원 샘플 수 제한 |

### ❌ 미구현·스텁

| 경로 | 상태 |
|------|------|
| `services/auth.service.ts` | 스텁만 (FastAPI 연동 예정) |
| `app/api/projects/route.ts` | 전체 주석 처리 |
| `automation` | Coming Soon (의도적) |

---

## 5. 구조적 이슈

### 5.1 컴포넌트 → mock 직접 import

FastAPI 연동 시 반드시 Service facade로 통일해야 합니다.

| 파일 | 직접 import |
|------|-------------|
| `performance-summary-view.tsx` | `@/lib/mocks/kanban.performance-summary.mock` |
| `input-management-tab.tsx` | (provider 경유 rows는 service 로드) |

### 5.2 Next.js API = interim

`USE_MOCK_API=false`일 때 브라우저 → `/api/*` → 서버 mock. FastAPI 도입 후:

- `*.api.service.ts`의 base URL을 FastAPI로 변경, 또는
- Next API를 BFF 프록시로 유지

### 5.3 쓰기(Mutation) 영속성

| API | 라우트 | Mock 갱신 |
|-----|--------|-----------|
| 칸반 CRUD | ✅ | ✅ |
| 사업평가 save/complete | ✅ | ✅ (task-detail mock) |
| 설문 save | ✅ | ✅ |
| CS 티켓 | ✅ | SMTP (`SMTP_USER`/`SMTP_PASS` 필요) |
| 실적 POST/PUT/DELETE | 라우트만 | ❌ |
| 전자책 POST | 라우트만 | ❌ |
| 파일 POST/DELETE | 라우트만 | ❌ |

### 5.4 에러·로딩·인증

- 페이지별 로딩/에러 처리 불균일 (`null`, 빈 테이블, `console.error` 혼재)
- 공통 `AsyncBoundary`·retry 없음
- 인증·토큰·RBAC 미구현

### 5.5 설문 데이터 이원화

- 칸반 업무: `kanban.task-detail` 설문 목록 (`Survey[]` 간단 타입)
- 글로벌: `survey.service` + `SurveyDetail` (네이버 폼 스타일)
- 빈 `kanban.survey.*` 스텁 — **통합 또는 삭제 필요**

---

## 6. FastAPI 스키마 매핑 참고

| 프론트 타입 | 리소스 |
|-------------|--------|
| `kanban.board.types.ts` | Board, Category, Task |
| `kanban.task-detail.types.ts` | Evaluation, TaskSurvey |
| `kanban.performance.types.ts` | PerformanceRow, MonthlyPlan |
| `kanban.documents.types.ts` | Reports, Budget, BusinessPlan |
| `survey.types.ts` | Survey, SurveyResults |
| `chat.types.ts` | CsTicket, ChatConfig |
| `organization.types.ts` | Department, Employee |
| `dashboard.types.ts` | DashboardOverview (DTO, `iconName`) |

---

## 7. 권장 연동 순서 (FastAPI)

1. 칸반 보드 (CRUD 완성도最高)
2. 조직·대시보드·전자책 (읽기 위주)
3. 실적 입력 + 요약 시트 + 월별계획 (집계·추경 버전)
4. 사업문서·설문·사업평가
5. 파일·CS 티켓 (첨부·메일)
6. 인증 (api-client 인터셉터)

---

## 8. 관련 문서

| 문서 | 용도 |
|------|------|
| [API_SPEC.md](./API_SPEC.md) | REST 경로·요청/응답·Service 매핑 |
| **본 문서** | 갭 분석·우선순위 TODO |

---

## 9. 파일 구조 목표 (연동 직전)

```
frontend-next/
├── lib/mocks/
├── services/
│   ├── api-client.ts          # ★ 미구현
│   ├── *.types.ts
│   ├── *.mock.service.ts
│   ├── *.api.service.ts
│   └── *.service.ts
├── app/api/                   # interim → FastAPI 후 proxy 또는 제거
└── docs/
    ├── API_SPEC.md
    └── FRONTEND_REVIEW.md
```

---

## 10. TODO (백로그)

우선순위: **P0** 연동 차단 · **P1** 기능/데이터 정합 · **P2** 품질 · **P3** 정리

### P0 — FastAPI 연동 전 필수

- [ ] **공통 API 클라이언트** — `services/api-client.ts` (base URL, JSON, `ApiError`, 401 처리)
- [ ] **환경 변수** — `NEXT_PUBLIC_API_BASE_URL`, mock/API 전환 문서화 (`.env.example`)
- [ ] **OpenAPI 합의** — FastAPI 팀과 prefix(`/api/v1`), 에러 JSON 형식, 페이지네이션 규칙
- [ ] **`*.api.service.ts` 일괄 점검** — `/api/...` → FastAPI 경로 매핑 표 작성
- [ ] **mock 직접 import 제거** — `performance-summary-view` 등 → `kanban.performance.service` 경유
- [ ] **`ebooks.api.service`** — `getCategoryStyles` / `getSuggestedQuestions` mock import 제거

### P1 — 기능·데이터 완성

#### 실적관리

- [ ] **`GET /api/performance/summary`** — 사업계획/실적/결과 시트용 API + `getPerformanceSummaryRows()` facade
- [ ] **사업계획 탭** — `MontlyPanView`를 `getMonthlyPlan(version)` + 추경(`planVersion`) 다시 연결하거나, 요약 API와 역할 분리 명확화
- [ ] **실적 입력 저장** — `saveInputManagementRows()` mutation + mock/ FastAPI 영속화
- [ ] **NAS 불러오기 / 디바이스 업로드** — 실제 API 스펙 정의 (현재 목업만)
- [ ] **추경 추가** — 서버에 supplement 버전 저장

#### 칸반·업무 상세

- [ ] **칸반 DnD** — 컬럼/순서 변경 시 `updateTask` 호출
- [ ] **`business-plan-tab`** — task-detail 또는 documents service 연동, 하드코딩 제거
- [ ] **칸반 vs 글로벌 설문** — `kanban.survey.*` 스텁 삭제 또는 task-detail 설문과 타입 통합

#### 파일·조직

- [ ] **파일 관리 CRUD** — `createFolder`, `upload`, `delete`, `move` service + mock mutation
- [ ] **조직 mock** — 전체 부서·직원 샘플 보강

#### CS·문서

- [x] **CS 티켓 SMTP** — `lib/chat/cs-email.ts` + `.env` `SMTP_*` (티켓 DB는 미연동)
- [ ] **사업문서** — 연도·분기 필터 query 파라미터 API 반영

#### 설문

- [ ] **설문 게시/응답 수집** — public 응답 API (현재 결과는 mock 고정)
- [ ] **칸반 만족도 탭** — 글로벌 설문 상세로 deep link (`/survey/{id}`) 연결

### P2 — UX·품질

- [ ] **로딩/에러 공통 컴포넌트** — `AsyncBoundary`, toast, retry
- [ ] **Zod 응답 검증** — 주요 API 응답 runtime validate
- [ ] **Service 단위 테스트** — mock service 기준
- [ ] **접근성** — 챗봇·모달 포커스 트랩, 테이블 키보드
- [ ] **실적 시트** — 대용량 행 가상 스크롤 검토
- [ ] **인쇄/다운로드** — 문서·실적 보고서 PDF/엑셀 (현재 alert 목업)

### P3 — 레거시·정리

- [ ] **`lib/api.ts` 삭제** — 미사용 확인 후 제거
- [ ] **`app/api/projects/route.ts`** — 삭제 또는 kanban boards로 대체
- [ ] **`services/auth.service.ts`** — 구현 또는 파일 제거
- [ ] **dead code** — `structure.txt`, `struecture.txt`, 미사용 filter 컴포넌트
- [ ] **`dashboard.mockservice.ts`** — 파일명 `dashboard.mock.service.ts` 통일 (이미 통일됐는지 확인)
- [ ] **문서 동기화** — 기능 추가 시 API_SPEC + 본 REVIEW 동시 갱신 규칙

### P4 — 인증·배포 (후순위)

- [ ] **인증** — JWT/세션, `api-client` Authorization 헤더
- [ ] **RBAC** — 조직 `isAdmin` → 메뉴·기능 가드
- [ ] **프로덕션 mock 제외** — `lib/mocks` 번들 분리 검토
- [ ] **E2E** — Playwright 핵심 플로우 (칸반, 실적 입력, 설문 저장)

---

## 11. 결론

프론트엔드는 **Service + Mock + interim API** 패턴이 안정화되었고, **실적관리·사업문서·설문·사업평가·챗봇(CS·데이터·온톨로지)**까지 UI가 크게 확장되었습니다. 다만 **실적 요약 시트·사업계획 탭의 API 분리**, **입력/파일 mutation 영속화**, **공통 api-client** 없이는 FastAPI 연동 시 기술 부채가 빠르게 증가합니다.

백엔드와 [API_SPEC.md](./API_SPEC.md)를 기준으로 합의한 뒤, **§10 TODO의 P0 → P1** 순으로 처리하고 **칸반 → 실적 → 문서** 순 연동을 권장합니다.
