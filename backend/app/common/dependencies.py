import base64

from typing import Annotated



from fastapi import Depends, Header, HTTPException, status

from sqlalchemy.orm import Session



from app.modules.kanban.kanban_access import KanbanAccessContext

from app.modules.auth.service import AuthService

from app.modules.chat.service import ChatService

from app.modules.dashboard.service import DashboardService

from app.common.services.file_storage_service import FileStorageService

from app.modules.kanban.service import KanbanBoardService

from app.modules.organization.service import OrganizationService

from app.common.region_store.service import RegionStoreService

from app.modules.survey.service import SurveyService

from app.common.core.database import get_db

from app.common.core.security import decode_access_token

from app.common.domain.repositories.auth_repository import UserRecord

from app.common.di.container import ServiceContainer, build_container



REGION_IDS = {"chuncheon-north", "chuncheon-east"}





def get_service_container(db: Session = Depends(get_db)) -> ServiceContainer:
    return build_container(db)





def get_auth_service(

    container: ServiceContainer = Depends(get_service_container),

) -> AuthService:

    return container.auth





def get_dashboard_service(

    container: ServiceContainer = Depends(get_service_container),

) -> DashboardService:

    return container.dashboard





def get_organization_service(

    container: ServiceContainer = Depends(get_service_container),

) -> OrganizationService:

    return container.organization





def get_kanban_service(

    container: ServiceContainer = Depends(get_service_container),

) -> KanbanBoardService:

    return container.kanban





def get_file_storage_service(

    container: ServiceContainer = Depends(get_service_container),

) -> FileStorageService:

    return container.file_storage





def get_region_store_service(

    container: ServiceContainer = Depends(get_service_container),

) -> RegionStoreService:

    return container.region_store





def get_survey_service(

    container: ServiceContainer = Depends(get_service_container),

) -> SurveyService:

    return container.survey





def get_chat_service(

    container: ServiceContainer = Depends(get_service_container),

) -> ChatService:

    return container.chat





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

    auth: AuthService = Depends(get_auth_service),

) -> UserRecord:

    user = auth.get_user_by_id(user_id)

    if not user:

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    return user





def get_kanban_access_context(

    region_id: str = Depends(require_region_id),

    user: UserRecord = Depends(get_current_user),

    org: OrganizationService = Depends(get_organization_service),

) -> KanbanAccessContext:

    actor = org.resolve_actor(region_id, user)

    return KanbanAccessContext.from_actor(actor, display_name=user.name)





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

