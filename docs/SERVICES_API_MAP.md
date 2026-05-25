# 프론트 `services/` ↔ FastAPI `/api/v1` 매핑

`NEXT_PUBLIC_API_BASE_URL` 설정 시 `*.api.service.ts` → FastAPI → PostgreSQL.

## 저장 방식

| 구분 | 테이블 | 도메인 |
|------|--------|--------|
| 관계형 | `kanban_*`, `employees`, `dashboard_*`, `users` | 칸반, 조직, 대시보드, 인증 |
| JSON 도메인 | `region_json_stores` | 설문, 파일, 전자책, 실적, task-detail, 버전이력, 리포트, 챗, **전자결재** |

## 신규·보완 API (DB 저장)

| Method | Path | 프론트 |
|--------|------|--------|
| PUT | `/performance/input-management` | `saveInputManagementRows` |
| PUT | `/performance/monthly-plan` | `saveMonthlyPlan` |
| GET | `/performance/summary` | (집계 API) |
| GET | `/files/manager` | `getFileManagerState` (트리: `parentId`, `permission`, `taskOptions`, `recentIds`) |
| PUT | `/files/manager` | `saveFileManagerState` (전체 상태 동기화) |
| PATCH | `/files/{id}` | `patchFile` (단건 수정) |
| POST/DELETE | `/files`, `/files?id=` | `createFile`, `deleteFile` (폴더 삭제 시 하위 cascade) |
| PATCH | `/ebooks/{id}` | `updateEbook` |
| DELETE | `/ebooks/{id}` | `deleteEbook` |
| PUT | `/reports` | `saveReports` |
| DELETE | `/surveys/{id}` | `deleteSurvey` |
| PATCH | `/chat/config` | `saveChatConfig` |
| GET/POST/PATCH/DELETE | `/approvals` | `approvals.service` |
| POST/PATCH/DELETE | `/tasks` | (레거시 flat task) |
| PATCH | `/kanban/boards/{id}` | `updateProject` (alias) |

## Auth · Dashboard · Organization

| 프론트 | Method | FastAPI | DB |
|--------|--------|---------|-----|
| `login` | POST | `/auth/login` | users |
| `signup` | POST | `/auth/signup` | users |
| `getSession` | GET | `/auth/session` | — |
| `logout` | POST | `/auth/logout` | — |
| `getDashboardOverview` | GET | `/dashboard` | dashboard_* |
| `getDepartments` / `searchEmployees` | GET | `/employees` | employees (읽기) |
| `getOrganizationContext` | GET | `/employees/context` | 로그인 사용자 권한·연결 직원 |
| `getDepartmentOptions` | GET | `/employees/departments` | 부서 선택 목록 |
| `createEmployee` | POST | `/employees` | 직원 추가 (admin·관리직·팀장) |
| `updateEmployee` | PATCH | `/employees/{id}` | 직원 정보·사진·팀장 지정 |
| `updateDepartment` | PATCH | `/departments/{id}` | 부서명 수정 |

## Kanban boards (SQL)

| 프론트 | Method | FastAPI |
|--------|--------|---------|
| `getProjects` | GET | `/kanban/boards?year=` |
| `createProject` | POST | `/kanban/boards` |
| `updateProject` | PATCH | `/kanban/boards/{id}/details` 또는 `/boards/{id}` |
| `deleteProject` | DELETE | `/kanban/boards/{id}` |
| `createTask` / `updateTask` / `deleteTask` | POST/PATCH/DELETE | nested tasks |
| `getStaffList` 등 | GET | `/kanban/staff`, … |

칸반 변경 시 **버전 이력** JSON 자동 기록.

## Task detail · Survey · Files · Ebooks · Performance · Reports · Approvals

| 프론트 | Method | FastAPI | 저장 |
|--------|--------|---------|------|
| task-detail | GET/PATCH/POST | `/kanban/task-detail/*` | JSON |
| survey | GET/POST/DELETE | `/surveys`, `/surveys/{id}` | JSON |
| files | GET/POST/DELETE/PUT | `/files`, `/files/manager` | JSON |
| ebooks | GET/POST/PATCH/DELETE | `/ebooks` | JSON |
| performance | GET/PUT/POST/DELETE | `/performance*` | JSON |
| reports | GET/PUT | `/reports` | JSON |
| version-history | GET/POST | `/kanban/version-history` | JSON |
| **approvals** | CRUD | `/approvals` | JSON |

## Chat

| 프론트 | Method | FastAPI |
|--------|--------|---------|
| `getChatConfig` | GET | `/chat/config` |
| `saveChatConfig` | PATCH | `/chat/config` |
| `askAssistantQuestion` | POST | `/chat/assistant` |
| `submitCsTicket` | POST | `/chat/cs-ticket` |
| `getOntologyGraph` | GET | `/chat/ontology` |

## Legacy tasks

| Method | Path |
|--------|------|
| GET/POST/PATCH/DELETE | `/tasks` |

## Mock 모드

`NEXT_PUBLIC_USE_MOCK_API=true` → `*.mock.service` (브라우저만, DB 미사용).

## 아직 UI 미연동

| 항목 | 비고 |
|------|------|
| 조직원 CRUD | API·DB 스키마는 있으나 프론트 편집 UI 없음 |
| 대시보드 편집 | 읽기 전용 |
