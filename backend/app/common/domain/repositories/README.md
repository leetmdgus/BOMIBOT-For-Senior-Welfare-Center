# Domain repositories

## 관계형 (테이블 1:1 Repository)

| Repository | 테이블 | 용도 |
|------------|--------|------|
| `KanbanBoardRepository` | `kanban_projects`, `kanban_categories`, `kanban_tasks` | 칸반 보드·카드 메타 |
| `AuthRepository` | `users` | 로그인 |
| `OrganizationRepository` | `employees`, `departments` | 조직도 |
| `DashboardRepository` | `dashboard_*` | 대시보드 |
| `SurveyRepository` | `surveys`, `survey_responses` | 만족도 조사 (정규화) |

구현: `infrastructure/persistence/repositories/sqlalchemy_*.py`

## JSON 도메인 (region_json_stores)

**SQLAlchemy 모델:** `infrastructure/persistence/models/region_json_store.py`  
(`task_detail.py` 같은 별도 테이블 파일 없음 — `domain='task_detail'` 행이 곧 persistence)

| 계층 | 역할 |
|------|------|
| `RegionJsonStoreRepository` | 도메인 blob `get_payload` / `save_payload` (`domain/region_store/repository.py`) |
| `TaskDetailRepository` (Protocol) | `task_detail` → `businessPlanByTaskId`, `evaluationByTaskId` |
| `PerformanceRepository` (Protocol) | `performance` → `inputManagementByTaskId` |

**게이트웨이:** `application/region_store/gateway.py`  
**구현체:** `RegionStoreService` (application) — Performance/TaskDetail Protocol 충족.  
**분리된 use-case:** `region_store/approvals.py`, `region_store/chat_config.py`  
HTTP: `task_detail.py`, `stores.py` (`/performance`).

전체 구조: [docs/DDD_ARCHITECTURE.md](../../../../docs/DDD_ARCHITECTURE.md)

실적·사업계획서·사업평가는 **별도 SQL 테이블 Repository가 아니라** JSON runtime 키로 업무 ID별 저장됩니다.

설문(`SurveyModel`)처럼 테이블로 쪼개려면 `task_business_plans` 등 신규 모델 + Alembic 마이그레이션이 필요합니다.

자세한 JSON 경로: [docs/BUSINESS_TASK_STORAGE.md](../../../../docs/BUSINESS_TASK_STORAGE.md)
