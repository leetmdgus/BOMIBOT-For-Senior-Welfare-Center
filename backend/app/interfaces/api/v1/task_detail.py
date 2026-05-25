from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from app.application.kanban_task_options import resolve_kanban_card_title
from app.application.services.collaboration_broadcast import broadcast_document_saved
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.region_store_service import RegionStoreService
from app.interfaces.api.deps import (
    get_kanban_service,
    get_region_store_service,
    optional_user_display_name,
    require_region_id,
)

router = APIRouter(prefix="/kanban/task-detail", tags=["kanban-task-detail"])


def _require_task_id(task_id: str | None) -> str:
    if not task_id or not str(task_id).strip():
        raise HTTPException(status_code=400, detail="taskId is required")
    return str(task_id).strip()


def _card_title(
    kanban: KanbanBoardService,
    region_id: str,
    task_id: str,
) -> str | None:
    return resolve_kanban_card_title(kanban, region_id, task_id)


@router.get("/surveys")
def task_detail_surveys(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    return service.list_task_surveys(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.get("/files")
def task_detail_files(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    task_id: str = Query(..., alias="taskId"),
):
    return service.get_evaluation_files(region_id, _require_task_id(task_id))


@router.get("/view-together-files")
def view_together_files(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_view_together_files(region_id)


@router.get("/evaluation/template")
def evaluation_template(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    return service.get_evaluation_template(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.get("/evaluation")
def get_evaluation(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    return service.get_business_evaluation(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.patch("/evaluation")
def patch_evaluation(
    body: dict,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    task_id = _require_task_id(body.get("taskId"))
    saved = service.save_business_evaluation(
        region_id,
        task_id,
        {k: v for k, v in body.items() if k != "taskId"},
        user=user,
        card_title=_card_title(kanban, region_id, task_id),
    )
    background_tasks.add_task(
        broadcast_document_saved,
        region_id,
        task_id,
        "evaluation",
        saved,
        user_name=user,
    )
    return saved


@router.post("/evaluation/complete")
def complete_evaluation(
    body: dict,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    task_id = _require_task_id(body.get("taskId"))
    saved = service.complete_business_evaluation(
        region_id,
        task_id,
        user=user,
        card_title=_card_title(kanban, region_id, task_id),
    )
    background_tasks.add_task(
        broadcast_document_saved,
        region_id,
        task_id,
        "evaluation",
        saved,
        user_name=user,
    )
    return saved


@router.get("/business-plan")
def get_business_plan(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    return service.get_business_plan(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.patch("/business-plan")
def patch_business_plan(
    body: dict,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    user: str = Depends(optional_user_display_name),
):
    task_id = _require_task_id(body.get("taskId"))
    saved = service.save_business_plan(
        region_id,
        task_id,
        {k: v for k, v in body.items() if k != "taskId"},
        user=user,
        card_title=_card_title(kanban, region_id, task_id),
    )
    background_tasks.add_task(
        broadcast_document_saved,
        region_id,
        task_id,
        "business-plan",
        saved,
        user_name=user,
    )
    return saved
