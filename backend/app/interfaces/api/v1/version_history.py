from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.region_store_service import RegionStoreService
from app.interfaces.api.deps import (
    get_kanban_service,
    get_region_store_service,
    optional_user_display_name,
    require_region_id,
)
from app.interfaces.api.v1.kanban import _emit_kanban_refresh

router = APIRouter(prefix="/kanban/version-history", tags=["kanban-version-history"])


@router.get("")
def list_version_history(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    year: str | None = Query(default=None),
    action_type: str | None = Query(default=None, alias="actionType"),
    query: str | None = Query(default=None),
):
    return service.list_version_history(
        region_id,
        year=year,
        action_type=action_type or "all",
        query=query,
    )


@router.post("/{history_id}/restore")
async def restore_version_history(
    history_id: str,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    result: dict[str, Any] = kanban_service.restore_version_entry(
        region_id, history_id, user=user
    )
    if result.get("success") and result.get("projectId"):
        project_id = str(result["projectId"])
        year = str(result.get("year") or "2026")
        background_tasks.add_task(
            _emit_kanban_refresh,
            region_id,
            project_id,
            "restore_version",
            user,
            kanban_service,
        )
        result["refresh"] = {"year": year, "projectId": project_id}
    return result
