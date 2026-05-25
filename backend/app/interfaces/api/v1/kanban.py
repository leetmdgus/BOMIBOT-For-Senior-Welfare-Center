from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.collaboration_broadcast import broadcast_kanban_refresh
from app.application.services.kanban_board_service import KanbanBoardService
from app.core.database import get_db
from app.domain.scoped_ids import strip_scope
from app.interfaces.api.deps import (
    get_kanban_service,
    optional_user_display_name,
    require_region_id,
)

router = APIRouter(prefix="/kanban", tags=["kanban"])


async def _emit_kanban_refresh(
    region_id: str,
    project_id: str,
    action: str,
    user: str,
    kanban_service: KanbanBoardService,
    extra: dict[str, Any] | None = None,
) -> None:
    year = kanban_service.resolve_project_year(region_id, project_id)
    await broadcast_kanban_refresh(
        region_id,
        year,
        project_id=strip_scope(project_id),
        action=action,
        user_name=user,
        extra=extra,
    )


@router.get("/boards")
def list_boards(
    region_id: str = Depends(require_region_id),
    year: str = Query(default="2026"),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
):
    return kanban_service.list_projects(region_id, year)


@router.post("/boards", status_code=status.HTTP_201_CREATED)
def create_board(
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    created = kanban_service.create_project(region_id, body, user=user)
    year = str(body.get("year") or kanban_service.resolve_project_year(region_id, created["id"]))
    background_tasks.add_task(
        broadcast_kanban_refresh,
        region_id,
        year,
        project_id=created["id"],
        action="create_project",
        user_name=user,
    )
    return created


def _update_board_impl(
    project_id: str,
    body: dict[str, Any],
    region_id: str,
    kanban_service: KanbanBoardService,
    user: str,
    background_tasks: BackgroundTasks,
):
    project = kanban_service.update_project(region_id, project_id, body, user=user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    background_tasks.add_task(
        _emit_kanban_refresh,
        region_id,
        project_id,
        "update_project",
        user,
        kanban_service,
    )
    return project


@router.patch("/boards/{project_id}/details")
def update_board_details(
    project_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    return _update_board_impl(project_id, body, region_id, kanban_service, user, background_tasks)


@router.patch("/boards/{project_id}")
def update_board(
    project_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    return _update_board_impl(project_id, body, region_id, kanban_service, user, background_tasks)


@router.delete("/boards/{project_id}")
def delete_board(
    project_id: str,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    year = kanban_service.resolve_project_year(region_id, project_id)
    if not kanban_service.delete_project(region_id, project_id, user=user):
        raise HTTPException(status_code=404, detail="Project not found")
    background_tasks.add_task(
        broadcast_kanban_refresh,
        region_id,
        year,
        project_id=strip_scope(project_id),
        action="delete_project",
        user_name=user,
    )
    return {"success": True}


@router.post(
    "/boards/{project_id}/categories/{category_id}/tasks",
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: str,
    category_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    task = kanban_service.create_task(
        region_id, project_id, category_id, body, user=user
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    background_tasks.add_task(
        _emit_kanban_refresh,
        region_id,
        project_id,
        "create_task",
        user,
        kanban_service,
        {"taskId": task.get("id")},
    )
    return task


@router.patch("/boards/{project_id}/categories/{category_id}/tasks/{task_id}/details")
def update_task(
    project_id: str,
    category_id: str,
    task_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    task = kanban_service.update_task(
        region_id, project_id, category_id, task_id, body, user=user
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    background_tasks.add_task(
        _emit_kanban_refresh,
        region_id,
        project_id,
        "update_task",
        user,
        kanban_service,
        {"taskId": strip_scope(task_id)},
    )
    return task


@router.delete("/boards/{project_id}/categories/{category_id}/tasks/{task_id}")
def delete_task(
    project_id: str,
    category_id: str,
    task_id: str,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    if not kanban_service.delete_task(
        region_id, project_id, category_id, task_id, user=user
    ):
        raise HTTPException(status_code=404, detail="Task not found")
    background_tasks.add_task(
        _emit_kanban_refresh,
        region_id,
        project_id,
        "delete_task",
        user,
        kanban_service,
        {"taskId": strip_scope(task_id)},
    )
    return {"success": True}


@router.post("/boards/{project_id}/tasks/move")
def move_task(
    project_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
    db: Session = Depends(get_db),
):
    task = kanban_service.move_task(region_id, project_id, body, user=user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.commit()
    background_tasks.add_task(
        _emit_kanban_refresh,
        region_id,
        project_id,
        "move_task",
        user,
        kanban_service,
        {
            "taskId": body.get("taskId"),
            "fromCategoryId": body.get("fromCategoryId"),
            "toCategoryId": body.get("toCategoryId"),
        },
    )
    return task


@router.get("/staff")
def list_staff():
    return KanbanBoardService.get_staff()


@router.get("/column-types")
def list_column_types():
    return KanbanBoardService.get_column_types()


@router.get("/task-path-map")
def task_path_map():
    return KanbanBoardService.get_task_path_map()


@router.get("/project-image-options")
def project_image_options():
    return KanbanBoardService.get_project_image_options()


@router.get("/categories/column-type")
def column_type_by_title(title: str = Query(...)):
    column_type = KanbanBoardService.get_column_type_by_title(title)
    return {"columnType": column_type}
