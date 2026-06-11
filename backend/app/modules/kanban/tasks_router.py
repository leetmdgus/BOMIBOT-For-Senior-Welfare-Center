"""Legacy flat task list API (parity with Next /api/tasks)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.modules.kanban.service import KanbanBoardService
from app.common.dependencies import (
    get_kanban_service,
    optional_user_display_name,
    require_region_id,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    project_id: str | None = Query(default=None, alias="projectId"),
    category_id: str | None = Query(default=None, alias="categoryId"),
    year: str = Query(default="2026"),
):
    projects = kanban_service.list_projects(region_id, year)

    if project_id:
        project = next((p for p in projects if p.get("id") == project_id), None)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if category_id:
            category = next(
                (c for c in project.get("categories", []) if c.get("id") == category_id),
                None,
            )
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            return {
                "projectId": project_id,
                "categoryId": category_id,
                "tasks": category.get("tasks", []),
            }

        return {"projectId": project_id, "categories": project.get("categories", [])}

    all_tasks = []
    for project in projects:
        for category in project.get("categories", []):
            for task in category.get("tasks", []):
                all_tasks.append(
                    {
                        **task,
                        "projectId": project.get("id"),
                        "projectName": project.get("title"),
                        "categoryId": category.get("id"),
                        "categoryTitle": category.get("title"),
                    }
                )

    return {"tasks": all_tasks}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    body: dict,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    project_id = body.get("projectId")
    category_id = body.get("categoryId")
    if not project_id or not category_id:
        raise HTTPException(
            status_code=400,
            detail="projectId and categoryId are required",
        )
    task = kanban_service.create_task(
        region_id, project_id, category_id, body, user=user
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("")
def update_task(
    body: dict,
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    project_id: str = Query(..., alias="projectId"),
    category_id: str = Query(..., alias="categoryId"),
    task_id: str = Query(..., alias="taskId"),
    user: str = Depends(optional_user_display_name),
):
    updated = kanban_service.update_task(
        region_id, project_id, category_id, task_id, body, user=user
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@router.delete("")
def delete_task(
    region_id: str = Depends(require_region_id),
    kanban_service: KanbanBoardService = Depends(get_kanban_service),
    project_id: str = Query(..., alias="projectId"),
    category_id: str = Query(..., alias="categoryId"),
    task_id: str = Query(..., alias="taskId"),
    user: str = Depends(optional_user_display_name),
):
    if not kanban_service.delete_task(
        region_id, project_id, category_id, task_id, user=user
    ):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}
