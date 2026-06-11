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

router = APIRouter(tags=["files"])

@router.get("/files/manager")
def files_manager(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    # 칸반 프로젝트 트리를 한 번만 로드해 권한 필터·업무명 동기화가 공유한다.
    projects = load_kanban_projects(kanban, region_id, access=access)
    allowed = gather_accessible_task_ids(
        kanban, region_id, access, projects=projects
    )
    state = service.get_file_manager_state(region_id, allowed_task_ids=allowed)
    return apply_kanban_tasks_to_file_manager_state(
        state, kanban, region_id, access=access, projects=projects
    )


@router.put("/files/manager")
def save_files_manager(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
):
    projects = load_kanban_projects(kanban, region_id, access=access)
    allowed = gather_accessible_task_ids(
        kanban, region_id, access, projects=projects
    )
    incoming = body.get("files")
    if allowed is not None and isinstance(incoming, list):
        assert_files_payload_allowed(incoming, allowed)
    state = service.save_files_manager_state(region_id, body)
    return apply_kanban_tasks_to_file_manager_state(
        state, kanban, region_id, access=access, projects=projects
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


@router.get("/files/{file_id}/render-svg")
def render_file_svg(
    file_id: str,
    font_mode: str = Query(default=""),
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
    access: KanbanAccessContext = Depends(get_kanban_access_context),
) -> dict[str, Any]:
    """HWP/HWPX 파일을 rhwp로 페이지별 SVG로 정확 렌더링한다.

    기존 `/preview`(HTML 근사) 대비 한글 원본과 거의 동일한 레이아웃/표/폰트를 제공한다.
    """
    allowed = gather_accessible_task_ids(kanban, region_id, access)
    path, filename, _ = service.get_download_file(
        region_id,
        file_id,
        allowed_task_ids=allowed,
    )

    lower = filename.lower()
    if lower.endswith(".hwpx"):
        suffix = ".hwpx"
    elif lower.endswith(".hwp"):
        suffix = ".hwp"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HWP/HWPX 파일만 정확 렌더링을 지원합니다.",
        )

    raw = path.read_bytes()
    try:
        pages = render_to_svg_pages(raw, suffix=suffix, font_mode=font_mode)
    except RhwpNotAvailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except RhwpRenderError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    return {
        "format": suffix.lstrip("."),
        "sourceFilename": filename,
        "pageCount": len(pages),
        "pages": pages,
    }


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
