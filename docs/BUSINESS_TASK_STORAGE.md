# 사업관리(칸반 업무) — 실적·사업계획서·사업평가 저장 구조

**사업관리** 메뉴(`/kanban`) → 카드 클릭 → `/kanban/task/{taskId}/…` 화면의 데이터는 **이미 FastAPI 백엔드**에 연결되어 있습니다.  
`NEXT_PUBLIC_USE_MOCK_API=false` 이고 API 서버(9001)가 떠 있어야 DB에 저장됩니다.

## 한눈에 보기

| UI (업무 상세 탭) | 저장소 | DB | API prefix |
|-------------------|--------|-----|------------|
| **실적관리** (입력·사업계획·사업실적·사업결과) | `performance` JSON | `region_json_stores` | `/api/v1/performance` |
| **사업계획서** (문서 편집) | `task_detail` JSON | `region_json_stores` | `/api/v1/kanban/task-detail` |
| **사업평가** | `task_detail` JSON | `region_json_stores` | `/api/v1/kanban/task-detail` |
| 칸반 카드 제목·담당 등 | `kanban_*` 테이블 | PostgreSQL (관계형) | `/api/v1/kanban/boards/...` |

지역(북부/동부 등)마다 `region_json_stores` 행이 나뉩니다. 요청 헤더 `X-Region-Id`(로그인 세션)가 키입니다.

---

## 1. 실적관리 (`/kanban/task/{id}/performance`)

### 입력 데이터 (계획/실적 입력관리)

- **JSON 경로:** `performance` 도메인 → `runtime.inputManagementByTaskId[taskId]` (업무별 배열)
- **GET:** `GET /api/v1/performance?scope=input-management&taskId={taskId}`
- **저장:** `PUT /api/v1/performance/input-management?taskId={taskId}`  
  Body: `{ "rows": [ ... ] }`
- **프론트:** `kanban.performance.api.service.ts` → `getInputManagementRows` / `saveInputManagementRows`

### 사업계획·사업실적·사업결과 탭

- 별도 API 없음 — **입력관리 행을 클라이언트에서 집계**해 표시합니다.
- 저장은 위 **input-management** 한 경로로만 이뤄집니다.

### 지역 공통 월별계획(추경 등, 레거시)

- **JSON 경로:** `performance.monthlyPlans["기본계획" | "1차추경" | ...]`
- **GET/PUT:** `/api/v1/performance/monthly-plan?version=`
- 업무(task) 단위가 아니라 **지역 전체** 한 벌입니다.

### 시드 파일

- `backend/seed/data/performance.json`

---

## 2. 사업계획서 (`/kanban/task/{id}/business-plan`)

- **JSON 경로:** `task_detail` 도메인 → `runtime.businessPlanByTaskId[taskId]`
- **GET:** `GET /api/v1/kanban/task-detail/business-plan?taskId=`
- **저장:** `PATCH /api/v1/kanban/task-detail/business-plan` (body에 `taskId` + 문서 필드)
- **일괄 저장(계획+평가):** `PATCH /api/v1/kanban/task-detail/documents`  
  `{ "taskId", "plan": {...}, "evaluation": {...} }`
- **프론트:** `kanban.task-detail.api.service.ts`
- **시드:** `backend/seed/data/task_detail.json` (템플릿·기본 구조)

---

## 3. 사업평가 (`/kanban/task/{id}/evaluation`)

- **JSON 경로:** `task_detail` 도메인 → `runtime.evaluationByTaskId[taskId]`
- **GET:** `GET /api/v1/kanban/task-detail/evaluation?taskId=`
- **저장:** `PATCH /api/v1/kanban/task-detail/evaluation`
- **완료 처리:** `POST /api/v1/kanban/task-detail/evaluation/complete`
- **양식:** `GET /api/v1/kanban/task-detail/evaluation/template?taskId=`
- **첨부 목록:** `GET /api/v1/kanban/task-detail/files?taskId=` (파일 매니저 연동)

---

## 4. DDD 레이어 (domain/repository)

| 기능 | domain 계약 | 구현 |
|------|-------------|------|
| JSON blob I/O | `RegionJsonStoreRepository` | `SqlAlchemyJsonStoreRepository` |
| 사업계획서·사업평가 | `TaskDetailRepository` (Protocol) | `RegionStoreService` |
| 실적 입력 | `PerformanceRepository` (Protocol) | `RegionStoreService` |
| 칸반 카드 제목 등 | `KanbanBoardRepository` | `SqlAlchemyKanbanBoardRepository` (SQL) |

실적·계획·평가는 **업무별 SQL 테이블이 아니라** `region_json_stores` JSON runtime 키입니다.  
상세: `backend/app/domain/repositories/README.md`

## 5. 구현 코드 위치 (백엔드)

| 역할 | 파일 |
|------|------|
| HTTP 라우트 (실적) | `backend/app/interfaces/api/v1/stores.py` (`/performance*`) |
| HTTP 라우트 (계획·평가) | `backend/app/interfaces/api/v1/task_detail.py` |
| 저장·조회 로직 | `backend/app/application/services/region_store_service.py` |
| DB 모델 | `backend/app/infrastructure/persistence/models/region_json_store.py` |
| 시드 | `backend/scripts/seed.py` + `backend/seed/data/*.json` |

---

## 6. 로컬에서 DB 저장 확인

```bash
# 1) API 기동
cd backend && docker compose up -d --build api

# 2) 프론트 .env.local
# NEXT_PUBLIC_USE_MOCK_API=false
# NEXT_PUBLIC_USE_API_PROXY=true
# API_PROXY_URL=http://127.0.0.1:9001

# 3) 시드 (최초 1회)
cd backend && py -3 scripts/seed.py --missing-json
```

Swagger: http://127.0.0.1:9001/docs → `performance`, `kanban-task-detail` 태그.

DB 직접 확인 (예: performance 도메인):

```sql
SELECT region_id, domain, jsonb_pretty(payload->'runtime'->'inputManagementByTaskId')
FROM region_json_stores
WHERE domain = 'performance' AND region_id = 'north';  -- 지역 ID는 환경에 맞게
```

---

## 7. Mock 모드와의 차이

`NEXT_PUBLIC_USE_MOCK_API=true` 이면 **브라우저 메모리/로컬 mock**만 쓰고 FastAPI를 호출하지 않습니다.  
운영·통합 테스트 시 반드시 `false`로 두세요.

---

## 8. 향후 SQL 테이블 분리 (선택)

현재는 **지역별 JSON 도메인** 설계입니다. 업무별 버전 관리·대용량 첨부·복잡한 쿼리가 필요하면  
`task_business_plans`, `task_evaluations`, `task_performance_rows` 등으로 테이블 분리를 검토할 수 있습니다.  
당장 프론트 연동은 위 API로 동작합니다.
