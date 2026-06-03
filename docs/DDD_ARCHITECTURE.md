# Backend DDD 구조

## 레이어

| 레이어 | 경로 | 역할 |
|--------|------|------|
| **Domain** | `app/domain/` | Repository 포트, Protocol, ID/상수. SQL·HTTP 없음 |
| **Application** | `app/application/` | Use-case 오케스트레이션, 정책(`kanban_access`) |
| **Infrastructure** | `app/infrastructure/` | SQLAlchemy, 파일 저장, 시드, **DI** |
| **Interfaces** | `app/interfaces/api/` | FastAPI 라우터, `deps` → `build_container` |

의존 방향: `interfaces → application → domain` ← `infrastructure`

## Bounded Context

| Context | Domain | Application | API |
|---------|--------|-------------|-----|
| Auth | `repositories/auth_repository.py` | `services/auth_service.py` | `v1/auth.py` |
| Organization | `repositories/organization_repository.py` | `services/organization_service.py` | `v1/employees.py` |
| Kanban | `repositories/kanban_repository.py` | `services/kanban_board_service.py`, `kanban_access.py` | `v1/kanban.py` |
| Dashboard | `repositories/dashboard_repository.py` | `dashboard/service.py`, `dashboard/live_metrics.py` | `v1/dashboard.py` |
| Survey | `repositories/survey_repository.py` | `services/survey_service.py` | `v1/stores.py` (surveys) |
| Region store (JSON) | `region_store/repository.py`, `constants.py` | `region_store/gateway.py`, `services/region_store_service.py` | `stores.py`, `task_detail.py`, … |
| Approvals | `DOMAIN_APPROVALS` | `region_store/approvals.py` | `v1/approvals.py` |
| Chat | `DOMAIN_CHAT` | `services/chat_service.py`, `chat/*` | `v1/chat.py` |

### JSON region store

`region_json_stores` 테이블에 도메인별 blob. 공통 접근은 `RegionStoreGateway`.

- **분리 완료**: 전자결재(`ApprovalApplicationService`), 챗 설정(`ChatConfigApplicationService`)
- **예정 분리**: files, performance, task_detail, ebooks (현재 `RegionStoreService`에 통합)

`RegionStoreService`는 `PerformanceRepository`·`TaskDetailRepository` Protocol을 구조적으로 충족합니다.

## Composition root

```python
from app.infrastructure.di.container import build_container

container = build_container(db_session)
container.dashboard.get_overview(region_id, year="2026")
```

FastAPI: `interfaces/api/deps.py` → `get_service_container()` → 각 `get_*_service()`.

## 규칙

1. Domain에 `sqlalchemy`, `fastapi` import 금지
2. Application은 Repository **포트**에만 의존 (구현체는 DI에서 주입)
3. 라우터는 HTTP 변환만 — 접근 제어·집계는 application
4. `RegionJsonStoreRepository`에 ORM `Session` 노출하지 않음

## 마이그레이션 가이드

| 기존 | 권장 |
|------|------|
| `app.domain.region_store_domains` | `app.domain.region_store.constants` |
| `app.domain.scoped_ids` | `app.domain.shared.scoped_ids` |
| `app.application.dashboard_live` | `app.application.dashboard.live_metrics` |
| `deps.py`에서 repository 직접 생성 | `build_container(db)` |

하위 호환용 re-export shim은 점진적으로 제거할 수 있습니다.
