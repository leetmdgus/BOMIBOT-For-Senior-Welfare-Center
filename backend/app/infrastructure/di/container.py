"""
Composition root — FastAPI Depends는 interfaces 레이어에서 이 팩토리만 호출.

레이어링:
  interfaces → application services → domain ports
  infrastructure → SQLAlchemy repository 구현
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.application.services.auth_service import AuthService
from app.application.services.chat_service import ChatService
from app.application.services.dashboard_service import DashboardService
from app.application.services.file_storage_service import FileStorageService
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.organization_service import OrganizationService
from app.application.services.region_store_service import RegionStoreService
from app.application.services.survey_service import SurveyService
from app.core.config import Settings, get_settings
from app.infrastructure.persistence.repositories.sqlalchemy_auth_repository import (
    SqlAlchemyAuthRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_dashboard_repository import (
    SqlAlchemyDashboardRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_json_store_repository import (
    SqlAlchemyJsonStoreRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_kanban_repository import (
    SqlAlchemyKanbanBoardRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_organization_repository import (
    SqlAlchemyOrganizationRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_survey_repository import (
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


def build_container(db: Session, settings: Settings | None = None) -> ServiceContainer:
    settings = settings or get_settings()
    file_storage = FileStorageService()

    auth_repo = SqlAlchemyAuthRepository(db)
    org_repo = SqlAlchemyOrganizationRepository(db)
    kanban_repo = SqlAlchemyKanbanBoardRepository(db)
    dashboard_repo = SqlAlchemyDashboardRepository(db)
    json_repo = SqlAlchemyJsonStoreRepository(db)

    auth = AuthService(auth_repo)
    organization = OrganizationService(org_repo, auth_repo, file_storage)
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
