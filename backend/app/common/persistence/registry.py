"""SQLAlchemy 모델 레지스트리.

모든 도메인 모듈의 모델을 한 곳에서 import 하여 `Base.metadata` 가
완성되도록 보장한다(create_all / Alembic autogenerate 전에 필요).
기존 `app/infrastructure/persistence/models/__init__.py` 의 역할을 대체한다.
"""

from app.common.core.database import Base  # noqa: F401
from app.common.region_store.model import RegionJsonStoreModel
from app.modules.auth.login_event import LoginEventModel
from app.modules.auth.model import RegionModel, UserModel
from app.modules.dashboard.model import (
    CalendarEventModel,
    DashboardProgressModel,
    DashboardStatModel,
    VolunteerEventModel,
)
from app.modules.kanban.model import (
    KanbanCategoryModel,
    KanbanProjectModel,
    KanbanTaskModel,
)
from app.modules.organization.model import DepartmentModel, EmployeeModel
from app.modules.survey.model import SurveyModel, SurveyResponseModel

__all__ = [
    "Base",
    "RegionModel",
    "UserModel",
    "LoginEventModel",
    "DepartmentModel",
    "EmployeeModel",
    "DashboardStatModel",
    "DashboardProgressModel",
    "CalendarEventModel",
    "VolunteerEventModel",
    "KanbanProjectModel",
    "KanbanCategoryModel",
    "KanbanTaskModel",
    "RegionJsonStoreModel",
    "SurveyModel",
    "SurveyResponseModel",
]
