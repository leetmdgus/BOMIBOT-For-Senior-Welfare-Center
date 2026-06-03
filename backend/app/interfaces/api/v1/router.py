from fastapi import APIRouter

from app.interfaces.api.v1 import (
    approvals,
    auth,
<<<<<<< HEAD
=======
    automation,
>>>>>>> dev2
    chat,
    collaboration_ws,
    dashboard,
    employees,
    google_auth,
    kanban,
    stores,
    task_detail,
    tasks,
    version_history,
)

api_router = APIRouter()
api_router.include_router(collaboration_ws.router)
api_router.include_router(auth.router)
api_router.include_router(google_auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(employees.router)
api_router.include_router(kanban.router)
api_router.include_router(stores.router)
api_router.include_router(approvals.router)
<<<<<<< HEAD
=======
api_router.include_router(automation.router)
>>>>>>> dev2
api_router.include_router(task_detail.router)
api_router.include_router(version_history.router)
api_router.include_router(chat.router)
api_router.include_router(tasks.router)
