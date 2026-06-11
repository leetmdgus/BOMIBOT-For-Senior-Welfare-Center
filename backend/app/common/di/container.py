"""
Composition root — FastAPI Depends는 interfaces 레이어에서 이 팩토리만 호출.

레이어링:
  interfaces → application services → domain ports
  infrastructure → SQLAlchemy repository 구현
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from sqlalchemy.orm import Session

from app.modules.auth.service import AuthService
from app.modules.chat.service import ChatService
from app.modules.dashboard.service import DashboardService
from app.common.services.file_storage_service import FileStorageService
from app.modules.kanban.service import KanbanBoardService
from app.modules.organization.service import OrganizationService
from app.common.region_store.service import RegionStoreService
from app.modules.survey.service import SurveyService
from app.common.core.config import Settings, get_settings
from app.modules.auth.repository import (
    SqlAlchemyAuthRepository,
)
from app.modules.dashboard.repository import (
    SqlAlchemyDashboardRepository,
)
from app.common.region_store.repository_impl import (
    SqlAlchemyJsonStoreRepository,
)
from app.modules.kanban.repository import (
    SqlAlchemyKanbanBoardRepository,
)
from app.modules.organization.repository import (
    SqlAlchemyOrganizationRepository,
)
from app.modules.survey.repository import (
    SqlAlchemySurveyRepository,
)


@dataclass(frozen=True)
class ServiceContainer:
    auth: AuthService
    organization: OrganizationService
    kanban: KanbanBoardService
    dashboard: DashboardService
    region_store: RegionStoreService
    survey: SurveyService
    chat: ChatService
    file_storage: FileStorageService


@lru_cache(maxsize=1)
def _shared_file_storage() -> FileStorageService:
    """FileStorageService 는 stateless(저장 루트 경로만 보유) — 한 번만 생성해 재사용.

    생성자가 resolve()+mkdir() 디스크 I/O 를 하므로 요청마다 새로 만들면 느리다.
    """
    return FileStorageService()


def build_container(db: Session, settings: Settings | None = None) -> ServiceContainer:
    settings = settings or get_settings()
    file_storage = _shared_file_storage()

    auth_repo = SqlAlchemyAuthRepository(db)
    org_repo = SqlAlchemyOrganizationRepository(db)
    kanban_repo = SqlAlchemyKanbanBoardRepository(db)
    dashboard_repo = SqlAlchemyDashboardRepository(db)
    json_repo = SqlAlchemyJsonStoreRepository(db)

    organization = OrganizationService(org_repo, auth_repo, file_storage)
    # 회원가입 시 직원(조직현황) 등록을 위해 organization 을 주입.
    auth = AuthService(auth_repo, organization=organization)
    survey = SurveyService(SqlAlchemySurveyRepository(db), json_repo)
    region_store = RegionStoreService(json_repo, file_storage, survey_service=survey)
    kanban = KanbanBoardService(kanban_repo, region_store)
    dashboard = DashboardService(
        dashboard_repo,
        organization_repo=org_repo,
        kanban_repo=kanban_repo,
        performance=region_store,
    )
    chat = ChatService(
        settings,
        json_repo,
        region_store,
        dashboard,
        organization,
        kanban,
    )

    return ServiceContainer(
        auth=auth,
        organization=organization,
        kanban=kanban,
        dashboard=dashboard,
        region_store=region_store,
        survey=survey,
        chat=chat,
        file_storage=file_storage,
    )
