"""도메인 모듈 라우터 취합.

기존 `app/interfaces/api/v1/router.py` 를 대체한다. 각 도메인 모듈의 router 를
모아 단일 `api_router` 로 노출하며, `app.main` 이 `settings.api_v1_prefix` 아래 마운트한다.
경로/메서드는 리팩토링 전과 동일하다(계약 보존).
"""

from fastapi import APIRouter

from app.modules.approvals.router import router as approvals_router
from app.modules.auth.google_router import router as google_auth_router
from app.modules.auth.router import router as auth_router
from app.modules.automation.document_templates_router import (
    router as document_templates_router,
)
from app.modules.automation.router import router as automation_router
from app.modules.chat.router import router as chat_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.ebooks.router import router as ebooks_router
from app.modules.files.router import router as files_router
from app.modules.kanban.performance_router import router as performance_router
from app.modules.kanban.router import router as kanban_router
from app.modules.kanban.task_detail_router import router as kanban_task_detail_router
from app.modules.kanban.tasks_router import router as tasks_router
from app.modules.kanban.version_history_router import router as version_history_router
from app.modules.organization.router import router as organization_router
from app.modules.survey.router import router as survey_router

api_router = APIRouter()

# 등록 순서는 기존(interfaces/api/v1/router.py)과 동일한 도메인 순서를 유지한다.
for _router in (
    auth_router,
    google_auth_router,
    dashboard_router,
    organization_router,
    kanban_router,
    ebooks_router,
    files_router,
    performance_router,
    survey_router,
    approvals_router,
    automation_router,
    document_templates_router,
    version_history_router,
    kanban_task_detail_router,
    tasks_router,
    chat_router,
):
    api_router.include_router(_router)
