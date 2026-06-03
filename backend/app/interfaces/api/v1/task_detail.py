from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import Response

from app.application.http.content_disposition import attachment_content_disposition
from app.application.hwpx.export_service import HwpxExportService
from app.application.hwpx.document_sections import hwpx_export_document_sections
from app.application.kanban_access import KanbanAccessContext
from app.application.kanban_task_options import resolve_kanban_card_title
from app.application.services.collaboration_broadcast import broadcast_document_saved
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.region_store_service import RegionStoreService
from app.interfaces.api.deps import (
    get_kanban_access_context,
    get_kanban_service,
    get_region_store_service,
    optional_user_display_name,
    require_region_id,
)


router = APIRouter(prefix="/kanban/task-detail", tags=["kanban-task-detail"])
_hwpx_export = HwpxExportService()


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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    kanban.assert_task_access(region_id, tid, access)
    return service.list_task_surveys(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.get("/files")
def task_detail_files(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    kanban.assert_task_access(region_id, tid, access)
    return service.get_evaluation_files(region_id, tid)


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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    kanban.assert_task_access(region_id, tid, access)
    return service.get_evaluation_template(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.get("/evaluation")
def get_evaluation(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    kanban.assert_task_access(region_id, tid, access)
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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    user: str = Depends(optional_user_display_name),
):
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    user: str = Depends(optional_user_display_name),
):
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
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
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str = Query(..., alias="taskId"),
):
    tid = _require_task_id(task_id)
    kanban.assert_task_access(region_id, tid, access)
    return service.get_business_plan(
        region_id, tid, card_title=_card_title(kanban, region_id, tid)
    )


@router.post("/business-plan/hwpx")
def export_business_plan_hwpx(
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    """사회복지사업 단위사업계획서 HWPX 생성 — ex_사업계획.hwpx 템플릿, formData·sections 매핑."""
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
    card_title = _card_title(kanban, region_id, task_id)

    if isinstance(body.get("formData"), dict):
        form_data = body["formData"]
        sections = hwpx_export_document_sections(
            body.get("sections") if isinstance(body.get("sections"), list) else []
        )
    else:
        stored = service.get_business_plan(
            region_id, task_id, card_title=card_title
        )
        form_data = stored.get("formData") or {}
        sections = hwpx_export_document_sections(stored.get("sections"))

    payload, filename = _hwpx_export.build_business_plan_hwpx(
        form_data=form_data,
        sections=sections,
    )
    return Response(
        content=payload,
        media_type="application/hwp+zip",
        headers={
            "Content-Disposition": attachment_content_disposition(filename),
            "Content-Length": str(len(payload)),
        },
    )


@router.post("/evaluation/hwpx")
def export_business_evaluation_hwpx(
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    """최종사업평가서 HWPX 생성 — ex_사업평가 2.hwpx 템플릿, evaluation·sections 매핑."""
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
    card_title = _card_title(kanban, region_id, task_id)

    if isinstance(body.get("evaluation"), dict):
        evaluation = body["evaluation"]
        sections = evaluation.get("sections")
        if isinstance(sections, list):
            evaluation = {
                **evaluation,
                "sections": hwpx_export_document_sections(sections),
            }
    else:
        evaluation = service.get_business_evaluation(
            region_id, task_id, card_title=card_title
        )

    if "planForm" in body:
        raw_plan = body.get("planForm")
        plan_form = raw_plan if isinstance(raw_plan, dict) else None
    else:
        plan = service.get_business_plan(
            region_id, task_id, card_title=card_title
        )
        plan_form = plan.get("formData")

    payload, filename = _hwpx_export.build_business_evaluation_hwpx(
        evaluation=evaluation,
        plan_form=plan_form,
    )
    return Response(
        content=payload,
        media_type="application/hwp+zip",
        headers={
            "Content-Disposition": attachment_content_disposition(filename),
            "Content-Length": str(len(payload)),
        },
    )


@router.post("/business-plan/hwpx/preview")
def preview_business_plan_hwpx(
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    """사업계획서 HWPX A4 근사 미리보기 HTML (render_json + page canvas)."""
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
    card_title = _card_title(kanban, region_id, task_id)

    if isinstance(body.get("formData"), dict):
        form_data = body["formData"]
        sections = hwpx_export_document_sections(
            body.get("sections") if isinstance(body.get("sections"), list) else []
        )
    else:
        stored = service.get_business_plan(
            region_id, task_id, card_title=card_title
        )
        form_data = stored.get("formData") or {}
        sections = hwpx_export_document_sections(stored.get("sections"))

    html = _hwpx_export.build_business_plan_preview_html(
        form_data=form_data,
        sections=sections,
    )
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.post("/evaluation/hwpx/preview")
def preview_business_evaluation_hwpx(
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    """사업평가서 HWPX A4 근사 미리보기 HTML."""
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
    card_title = _card_title(kanban, region_id, task_id)

    if isinstance(body.get("evaluation"), dict):
        evaluation = body["evaluation"]
        sections = evaluation.get("sections")
        if isinstance(sections, list):
            evaluation = {
                **evaluation,
                "sections": hwpx_export_document_sections(sections),
            }
    else:
        evaluation = service.get_business_evaluation(
            region_id, task_id, card_title=card_title
        )
        sections = evaluation.get("sections")
        if isinstance(sections, list):
            evaluation = {
                **evaluation,
                "sections": hwpx_export_document_sections(sections),
            }

    html = _hwpx_export.build_business_evaluation_preview_html(
        evaluation=evaluation,
    )
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.patch("/documents")
def patch_task_documents(
    body: dict,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    user: str = Depends(optional_user_display_name),
):
    """사업계획서·사업평가를 한 번에 저장 (JSON 도메인 1회 로드/저장)."""
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
    plan_body = body.get("plan")
    evaluation_body = body.get("evaluation")
    if plan_body is None and evaluation_body is None:
        raise HTTPException(
            status_code=400,
            detail="plan or evaluation payload is required",
        )

    title = _card_title(kanban, region_id, task_id)
    saved = service.save_task_documents(
        region_id,
        task_id,
        plan=plan_body if isinstance(plan_body, dict) else None,
        evaluation=evaluation_body if isinstance(evaluation_body, dict) else None,
        user=user,
        card_title=title,
    )

    if "plan" in saved:
        background_tasks.add_task(
            broadcast_document_saved,
            region_id,
            task_id,
            "business-plan",
            saved["plan"],
            user_name=user,
        )
    if "evaluation" in saved:
        background_tasks.add_task(
            broadcast_document_saved,
            region_id,
            task_id,
            "evaluation",
            saved["evaluation"],
            user_name=user,
        )

    return saved


@router.patch("/business-plan")
def patch_business_plan(
    body: dict,
    background_tasks: BackgroundTasks,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    user: str = Depends(optional_user_display_name),
):
    task_id = _require_task_id(body.get("taskId"))
    kanban.assert_task_access(region_id, task_id, access)
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
