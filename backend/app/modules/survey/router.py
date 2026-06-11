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

router = APIRouter(tags=["surveys"])

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


def _find_survey_region(service: RegionStoreService, survey_id: str) -> str:
    """region 없이 survey_id만으로 설문이 속한 지역을 탐색(알려진 지역만)."""
    for region_id in REGION_IDS:
        try:
            service.get_survey_detail(region_id, survey_id)
            return region_id
        except HTTPException:
            continue
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="설문을 찾을 수 없습니다."
    )


def _public_survey_detail_or_404(
    service: RegionStoreService, region_id: str, survey_id: str
) -> dict:
    """게시(active)·응답 허용 상태만 노출(초안 보호)."""
    detail = service.get_survey_detail(region_id, survey_id)
    basic = detail.get("basicInfo") or {}
    settings = detail.get("settings") or {}
    if basic.get("status") != "active" or settings.get("acceptResponses") is False:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="현재 응답할 수 없는 설문입니다.",
        )
    return detail


# region 없는 링크(예: 주소창 URL 공유)도 응답 가능하도록 survey_id만으로 해석.
# 주의: 더 구체적인 by-id 라우트를 {region_id} 라우트보다 먼저 선언해야 한다(선매칭).
@router.get("/public/surveys/by-id/{survey_id}")
def public_survey_detail_by_id(
    survey_id: str,
    service: RegionStoreService = Depends(get_region_store_service),
):
    """region 없이 survey_id만으로 공개 응답용 설문 상세를 조회."""
    region_id = _find_survey_region(service, survey_id)
    return _public_survey_detail_or_404(service, region_id, survey_id)


@router.post("/public/surveys/by-id/{survey_id}/responses")
def public_survey_responses_by_id(
    survey_id: str,
    body: dict,
    service: RegionStoreService = Depends(get_region_store_service),
):
    """region 없이 survey_id만으로 공개 응답 제출."""
    region_id = _find_survey_region(service, survey_id)
    return service.submit_survey_response(region_id, survey_id, body)


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
    return _public_survey_detail_or_404(service, region_id, survey_id)


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
