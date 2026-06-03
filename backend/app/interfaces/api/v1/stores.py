from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response

from app.application.files.document_preview import (
    is_previewable_filename,
    render_document_preview_fragment,
)
from app.application.http.content_disposition import attachment_content_disposition
from app.application.hwpx.hwpx_package import is_hwpx_filename
from app.application.kanban_access import (
    KanbanAccessContext,
    assert_files_payload_allowed,
    gather_accessible_task_ids,
)
from app.application.kanban_task_options import (
    apply_kanban_tasks_to_file_manager_state,
    resolve_kanban_card_title,
    resolve_kanban_task_name,
)
from app.application.services.kanban_board_service import KanbanBoardService
from app.application.services.region_store_service import RegionStoreService
from app.domain.scoped_ids import strip_scope
from app.interfaces.api.deps import (
    REGION_IDS,
    get_kanban_access_context,
    get_kanban_service,
    get_region_store_service,
    optional_user_display_name,
    require_region_id,
)

router = APIRouter(tags=["stores"])


@router.get("/ebooks")
def list_ebooks(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
):
    return service.list_ebooks(region_id, category=category, search=search)


@router.post("/ebooks", status_code=status.HTTP_201_CREATED)
def create_ebook(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.create_ebook(region_id, body)


@router.patch("/ebooks/{ebook_id}")
def patch_ebook(
    ebook_id: str,
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.update_ebook(region_id, ebook_id, body)


@router.delete("/ebooks/{ebook_id}")
def delete_ebook(
    ebook_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.delete_ebook(region_id, ebook_id)


@router.get("/ebooks/category-styles")
def ebook_category_styles(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_category_styles(region_id)


@router.get("/ebooks/suggested-questions")
def ebook_suggested_questions(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_suggested_questions(region_id)


@router.get("/files/manager")
def files_manager(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    state = service.get_file_manager_state(region_id, allowed_task_ids=allowed)
    return apply_kanban_tasks_to_file_manager_state(
        state, kanban, region_id, access=access
    )


@router.put("/files/manager")
def save_files_manager(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    incoming = body.get("files")
    if allowed is not None and isinstance(incoming, list):
        assert_files_payload_allowed(incoming, allowed)
    state = service.save_files_manager_state(region_id, body)
    return apply_kanban_tasks_to_file_manager_state(
        state, kanban, region_id, access=access
    )


@router.get("/files")
def list_files(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    folder: str | None = Query(default=None),
    type: str | None = Query(default=None, alias="type"),
    search: str | None = Query(default=None),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    return service.list_files(
        region_id,
        folder=folder,
        file_type=type,
        search=search,
        allowed_task_ids=allowed,
    )


@router.post("/files", status_code=status.HTTP_201_CREATED)
def create_file(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    item_type = str(body.get("type") or "document").strip().lower()
    task_id = body.get("taskId") or body.get("task_id")
    if task_id and str(task_id).strip():
        kanban.assert_task_access(region_id, str(task_id).strip(), access)
    elif item_type != "folder" and not access.bypass:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="담당 업무를 지정한 뒤 파일을 추가해 주세요.",
        )
    return service.create_file(region_id, body)


@router.patch("/files/{file_id}")
def patch_file(
    file_id: str,
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    service.assert_file_access(region_id, file_id, allowed_task_ids=allowed)
    next_task = body.get("taskId") or body.get("task_id")
    if next_task and str(next_task).strip():
        kanban.assert_task_access(region_id, str(next_task).strip(), access)
    return service.patch_file(region_id, file_id, body)


@router.delete("/files")
def delete_file(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    id: str = Query(...),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    service.assert_file_access(region_id, id, allowed_task_ids=allowed)
    return service.delete_file(region_id, id)


@router.post("/files/upload", status_code=status.HTTP_201_CREATED)
async def upload_files(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    parent_id: Annotated[str | None, Form(alias="parentId")] = None,
    task_id: Annotated[str | None, Form(alias="taskId")] = None,
    files: list[UploadFile] = File(...),
):
    if task_id and str(task_id).strip():
        kanban.assert_task_access(region_id, str(task_id).strip(), access)
    elif not access.bypass:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="담당 업무를 선택한 뒤 업로드해 주세요.",
        )
    uploads: list[tuple[str, bytes, str | None]] = []
    for upload in files:
        content = await upload.read()
        uploads.append(
            (
                upload.filename or "upload.bin",
                content,
                upload.content_type,
            )
        )
    task_name = (
        resolve_kanban_task_name(kanban, region_id, task_id) if task_id else None
    )
    created = service.upload_binary_files(
        region_id,
        uploads,
        parent_id=parent_id or None,
        task_id=task_id or None,
        task_name=task_name,
    )
    return {"files": created}


@router.get("/files/{file_id}/content")
def download_file_content(
    file_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    path, filename, media_type = service.get_download_file(
        region_id,
        file_id,
        allowed_task_ids=allowed,
    )
    disposition = attachment_content_disposition(filename)
    if is_hwpx_filename(filename):
        payload = path.read_bytes()
        return Response(
            content=payload,
            media_type=media_type or "application/hwp+zip",
            headers={"Content-Disposition": disposition},
        )
    return FileResponse(
        path,
        media_type=media_type,
        headers={"Content-Disposition": disposition},
    )


@router.get("/files/{file_id}/preview")
def preview_file_content(
    file_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    """Excel(.xlsx/.xls/.csv)·HWPX·Word(.docx) HTML 미리보기."""
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    path, filename, _ = service.get_download_file(
        region_id,
        file_id,
        allowed_task_ids=allowed,
    )
    if not is_previewable_filename(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 파일 형식은 미리보기를 지원하지 않습니다.",
        )
    raw = path.read_bytes()
    html_fragment = render_document_preview_fragment(raw, filename)
    return {"html": html_fragment, "filename": filename}


@router.get("/files/{file_id}/export")
def export_file_or_folder(
    file_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    """폴더·파일(하위 포함) ZIP export."""
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    payload, filename = service.build_export_archive(
        region_id,
        [file_id],
        allowed_task_ids=allowed,
    )
    return Response(
        content=payload,
        media_type="application/zip",
        headers={"Content-Disposition": attachment_content_disposition(filename)},
    )


@router.post("/files/export")
def export_files_bulk(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    ids = body.get("ids") or body.get("fileIds") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ids array is required",
        )
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    payload, filename = service.build_export_archive(
        region_id,
        [str(item) for item in ids],
        allowed_task_ids=allowed,
    )
    return Response(
        content=payload,
        media_type="application/zip",
        headers={"Content-Disposition": attachment_content_disposition(filename)},
    )


@router.post("/files/{file_id}/copy", status_code=status.HTTP_201_CREATED)
def copy_file(
    file_id: str,
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    service.assert_file_access(region_id, file_id, allowed_task_ids=allowed)
    return service.copy_file_item(region_id, file_id, body)


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


@router.get("/surveys")
def survey_list(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str | None = Query(default=None, alias="taskId"),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
):
    if task_id and str(task_id).strip():
        kanban.assert_task_access(region_id, str(task_id).strip(), access)
    items = service.list_surveys(
        region_id, task_id=task_id, status=status, search=search
    )
    if access.bypass:
        return items
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    if allowed is None:
        return items
    return [
        item
        for item in items
        if strip_scope(str(item.get("taskId") or "")) in allowed
    ]


@router.get("/surveys/{survey_id}")
def survey_detail(
    survey_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
    task_id: str | None = Query(default=None, alias="taskId"),
):
    if task_id and str(task_id).strip():
        kanban.assert_task_access(region_id, str(task_id).strip(), access)
    detail = service.get_survey_detail(region_id, survey_id, task_id=task_id)
    if not access.bypass:
        linked = strip_scope(str(detail.get("taskId") or task_id or ""))
        if linked:
            kanban.assert_task_access(region_id, linked, access)
    return detail


@router.post("/surveys/{survey_id}")
def survey_save(
    survey_id: str,
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    task_id: str | None = Query(default=None, alias="taskId"),
):
    return service.save_survey(region_id, survey_id, body, task_id=task_id)


@router.get("/surveys/{survey_id}/results")
def survey_results(
    survey_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_survey_results(region_id, survey_id)


@router.post("/surveys/{survey_id}/responses")
def survey_responses(
    survey_id: str,
    body: dict,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.submit_survey_response(region_id, survey_id, body)


# ── 공개(QR) 설문 — 로그인·task_id 불필요. 지역은 경로로 받고, 게시·응답중인 설문만 노출 ──


def _require_known_region(region_id: str) -> str:
    if region_id not in REGION_IDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="알 수 없는 지역입니다.")
    return region_id


@router.get("/public/surveys/{region_id}")
def public_survey_list(
    region_id: str,
    service: RegionStoreService = Depends(get_region_store_service),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
):
    """task_id 없이 지역 설문 목록(공개). 임시(초안)는 제외."""
    _require_known_region(region_id)
    items = service.list_surveys(region_id, status=status_filter, search=search)
    return [item for item in items if item.get("status") != "임시"]


@router.get("/public/surveys/{region_id}/{survey_id}")
def public_survey_detail(
    region_id: str,
    survey_id: str,
    service: RegionStoreService = Depends(get_region_store_service),
):
    """공개 응답용 설문 상세 — 게시(active)·응답 허용 상태만 노출(초안 보호)."""
    _require_known_region(region_id)
    detail = service.get_survey_detail(region_id, survey_id)
    basic = detail.get("basicInfo") or {}
    settings = detail.get("settings") or {}
    if basic.get("status") != "active" or settings.get("acceptResponses") is False:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="현재 응답할 수 없는 설문입니다.",
        )
    return detail


@router.post("/public/surveys/{region_id}/{survey_id}/responses")
def public_survey_responses(
    region_id: str,
    survey_id: str,
    body: dict,
    service: RegionStoreService = Depends(get_region_store_service),
):
    """공개 응답 제출 — submit_survey_response가 응답 허용·active 여부를 재검증."""
    _require_known_region(region_id)
    return service.submit_survey_response(region_id, survey_id, body)


@router.post("/surveys/{survey_id}/close")
def survey_close(
    survey_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.close_survey(region_id, survey_id)


@router.post("/surveys/{survey_id}/duplicate")
def survey_duplicate(
    survey_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.duplicate_survey(region_id, survey_id)


@router.delete("/surveys/{survey_id}")
def delete_survey(
    survey_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.delete_survey(region_id, survey_id)
