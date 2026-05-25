import base64
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.auth_service import AuthService
from app.application.services.chat_service import ChatService
from app.application.services.dashboard_service import DashboardService
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.organization_service import OrganizationService
from app.application.services.file_storage_service import FileStorageService
from app.application.services.region_store_service import RegionStoreService
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.infrastructure.persistence.repositories.sqlalchemy_auth_repository import (
    SqlAlchemyAuthRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_dashboard_repository import (
    SqlAlchemyDashboardRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_kanban_repository import (
    SqlAlchemyKanbanBoardRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_json_store_repository import (
    SqlAlchemyJsonStoreRepository,
)
from app.infrastructure.persistence.repositories.sqlalchemy_organization_repository import (
    SqlAlchemyOrganizationRepository,
)

REGION_IDS = {"chuncheon-north", "chuncheon-east"}


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(SqlAlchemyAuthRepository(db))


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(SqlAlchemyDashboardRepository(db))


def get_organization_service(db: Session = Depends(get_db)) -> OrganizationService:
    return OrganizationService(
        SqlAlchemyOrganizationRepository(db),
        SqlAlchemyAuthRepository(db),
        FileStorageService(),
    )


def get_kanban_service(db: Session = Depends(get_db)) -> KanbanBoardService:
    json_repo = SqlAlchemyJsonStoreRepository(db)
    return KanbanBoardService(
        SqlAlchemyKanbanBoardRepository(db),
        RegionStoreService(json_repo),
    )


def get_file_storage_service() -> FileStorageService:
    return FileStorageService()


def get_region_store_service(db: Session = Depends(get_db)) -> RegionStoreService:
    return RegionStoreService(
        SqlAlchemyJsonStoreRepository(db),
        FileStorageService(),
    )


def get_chat_service(db: Session = Depends(get_db)) -> ChatService:
    json_repo = SqlAlchemyJsonStoreRepository(db)
    return ChatService(
        get_settings(),
        json_repo,
        RegionStoreService(json_repo),
        DashboardService(SqlAlchemyDashboardRepository(db)),
        OrganizationService(SqlAlchemyOrganizationRepository(db)),
        KanbanBoardService(
            SqlAlchemyKanbanBoardRepository(db),
            RegionStoreService(json_repo),
        ),
    )


def require_region_id(
    x_region_id: Annotated[str | None, Header(alias="X-Region-Id")] = None,
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> str:
    region_id = x_region_id
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload and payload.get("region_id"):
            region_id = str(payload["region_id"])

    if not region_id or region_id not in REGION_IDS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return region_id


def require_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return str(payload["sub"])


def get_current_user(
    user_id: str = Depends(require_user_id),
    db: Session = Depends(get_db),
) -> "UserRecord":
    from app.domain.repositories.auth_repository import UserRecord

    user = SqlAlchemyAuthRepository(db).get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


def optional_user_display_name(
    x_user_name: Annotated[str | None, Header(alias="X-User-Name")] = None,
    x_user_name_b64: Annotated[str | None, Header(alias="X-User-Name-B64")] = None,
) -> str:
    if x_user_name_b64:
        try:
            decoded = base64.b64decode(x_user_name_b64, validate=True).decode("utf-8").strip()
            if decoded:
                return decoded
        except (ValueError, UnicodeDecodeError):
            pass
    name = (x_user_name or "").strip()
    return name or "시스템"
