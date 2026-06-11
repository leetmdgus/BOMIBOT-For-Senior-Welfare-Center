from datetime import datetime
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response

from app.modules.files.document_preview import (
    is_previewable_filename,
    render_document_preview_fragment,
)
from app.common.http.content_disposition import attachment_content_disposition
from app.common.hwpx.hwpx_package import is_hwpx_filename
from app.common.hwpx.rhwp_render import (
    RhwpNotAvailableError,
    RhwpRenderError,
    render_to_svg_pages,
)
from app.modules.kanban.kanban_access import (
    KanbanAccessContext,
    assert_files_payload_allowed,
    gather_accessible_task_ids,
)
from app.modules.kanban.kanban_task_options import (
    apply_kanban_tasks_to_file_manager_state,
    load_kanban_projects,
    resolve_kanban_card_title,
    resolve_kanban_task_name,
)
from app.modules.kanban.service import KanbanBoardService
from app.modules.organization.service import OrganizationService
from app.common.region_store.service import RegionStoreService
from app.common.domain.scoped_ids import strip_scope
from app.common.dependencies import (
    REGION_IDS,
    get_kanban_access_context,
    get_kanban_service,
    get_organization_service,
    get_region_store_service,
    optional_user_display_name,
    require_region_id,
)

router = APIRouter(tags=["performance"])

@router.get("/performance")
def performance(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    scope: str | None = Query(default=None),
    project_id: str | None = Query(default=None, alias="projectId"),
    month: str | None = Query(default=None),
    task_id: str | None = Query(default=None, alias="taskId"),
):
    if scope == "input-management":
        if not task_id or not str(task_id).strip():
            raise HTTPException(
                status_code=400,
                detail="taskId is required for input-management scope",
            )
        kanban.assert_task_access(region_id, str(task_id).strip(), access)
        task_title = resolve_kanban_card_title(kanban, region_id, task_id)
        return {
            "data": service.get_input_management_rows(
                region_id,
                task_id,
                task_title=task_title,
            )
        }
    if scope == "input-meta":
        return service.get_performance_input_meta(region_id)
    return service.get_performance_rows(region_id, project_id=project_id, month=month)


@router.post("/performance", status_code=status.HTTP_201_CREATED)
def create_performance_record(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.create_performance_record(region_id, body)


@router.put("/performance")
def update_performance_record(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.update_performance_record(region_id, body)


@router.delete("/performance")
def delete_performance_record(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    id: str = Query(...),
):
    return service.delete_performance_record(region_id, id)


@router.get("/performance/monthly-plan")
def performance_monthly_plan(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    version: str = Query(default="기본계획"),
):
    return service.get_monthly_plan(region_id, version)


@router.put("/performance/input-management")
def save_input_management(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    user: str = Depends(optional_user_display_name),
    task_id: str | None = Query(default=None, alias="taskId"),
):
    if not task_id or not str(task_id).strip():
        raise HTTPException(
            status_code=400,
            detail="taskId is required for input-management save",
        )
    kanban.assert_task_access(region_id, str(task_id).strip(), access)
    rows = body.get("rows", [])
    if not isinstance(rows, list):
        rows = []
    return service.save_input_management_rows(
        region_id,
        rows,
        task_id=task_id,
        user=user,
    )


@router.put("/performance/monthly-plan")
def save_monthly_plan(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    version: str = Query(default="기본계획"),
):
    return service.save_monthly_plan(region_id, version, body)


@router.get("/reports")
def reports(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    type: str | None = Query(default=None),
    year: int | None = Query(default=None),
    quarter: int = Query(default=1, ge=1, le=4),
    periodMode: str = Query(default="quarter"),
):
    report_year = year if year is not None else datetime.now().year
    projects = kanban.list_projects(region_id, str(report_year), access=access)
    return service.get_reports(
        region_id,
        type,
        year=report_year,
        quarter=quarter,
        period_mode=periodMode,
        kanban_projects=projects,
    )


@router.put("/reports")
def save_reports(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    type: str | None = Query(default=None),
):
    return service.save_reports(region_id, body, type)


@router.get("/performance/summary")
def performance_summary(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_performance_summary(region_id)
