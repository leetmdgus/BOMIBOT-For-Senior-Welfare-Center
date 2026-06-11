from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.common.services.business_documents_search_service import (
    BusinessDocumentsSearchService,
)
from app.common.services.collaboration_broadcast import broadcast_kanban_refresh
from app.modules.kanban.service import KanbanBoardService
from app.modules.organization.service import OrganizationService
from app.common.region_store.service import RegionStoreService
from app.common.core.database import get_db
from app.common.domain.scoped_ids import strip_scope
from app.modules.kanban.kanban_access import KanbanAccessContext
from app.common.dependencies import (
    get_kanban_access_context,
    get_kanban_service,
    get_organization_service,
    get_region_store_service,
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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    return kanban_service.list_projects(region_id, year, access=access)


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
    access: KanbanAccessContext,
):
    kanban_service.assert_project_access(region_id, project_id, access)
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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    kanban_service.assert_project_access(region_id, project_id, access)
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


def _patch_task(
    *,
    project_id: str,
    category_id: str,
    task_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str,
    kanban_service: KanbanBoardService,
    user: str,
    access: KanbanAccessContext,
) -> dict[str, Any]:
    kanban_service.assert_task_access(region_id, task_id, access)
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


@router.patch("/boards/{project_id}/categories/{category_id}/tasks/{task_id}")
def update_task(
    project_id: str,
    category_id: str,
    task_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    return _patch_task(
        project_id=project_id,
        category_id=category_id,
        task_id=task_id,
        body=body,
        background_tasks=background_tasks,
        region_id=region_id,
        kanban_service=kanban_service,
        user=user,
        access=access,
    )


@router.patch("/boards/{project_id}/categories/{category_id}/tasks/{task_id}/details")
def update_task_details(
    project_id: str,
    category_id: str,
    task_id: str,
    body: dict[str, Any],
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    return _patch_task(
        project_id=project_id,
        category_id=category_id,
        task_id=task_id,
        body=body,
        background_tasks=background_tasks,
        region_id=region_id,
        kanban_service=kanban_service,
        user=user,
        access=access,
    )


@router.delete("/boards/{project_id}/categories/{category_id}/tasks/{task_id}")
def delete_task(
    project_id: str,
    category_id: str,
    task_id: str,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    kanban_service.assert_task_access(region_id, task_id, access)
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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    db: Session = Depends(get_db),
):
    task_id = str(body.get("taskId") or body.get("task_id") or "").strip()
    if task_id:
        kanban_service.assert_task_access(region_id, task_id, access)
    else:
        kanban_service.assert_project_access(region_id, project_id, access)
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
def list_staff(
    region_id: str = Depends(require_region_id),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    """칸반 담당자 선택 — 조직도 직원 목록."""
    result = organization_service.search(region_id)
    employees = result.get("employees") or []
    if not employees:
        return KanbanBoardService.get_staff()

    staff: list[dict[str, str]] = []
    seen: set[str] = set()
    for employee in employees:
        employee_id = str(employee.get("id") or "").strip()
        name = str(employee.get("name") or "").strip()
        if not employee_id or not name or employee_id in seen:
            continue
        seen.add(employee_id)
        staff.append(
            {
                "id": employee_id,
                "name": name,
                "team": str(employee.get("department") or ""),
                "position": str(
                    employee.get("position") or employee.get("role") or ""
                ),
            }
        )
    return staff or KanbanBoardService.get_staff()


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


@router.post("/documents/search")
def search_business_documents(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    region_store: RegionStoreService = Depends(get_region_store_service),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
):
    query = str(body.get("query") or "")
    raw_task_id = body.get("taskId")
    raw_limit = body.get("limit")
    year = str(body.get("year") or "").strip() or None
    category = str(body.get("category") or "").strip() or None
    extension = str(body.get("extension") or "").strip() or None
    try:
        limit = int(raw_limit) if raw_limit is not None else 12
    except (TypeError, ValueError):
        limit = 12
    service = BusinessDocumentsSearchService(region_store, kanban_service)
    return service.search(
        region_id,
        query,
        access=access,
        task_id=str(raw_task_id) if raw_task_id else None,
        limit=limit,
        year=year,
        category=category,
        extension=extension,
    )
