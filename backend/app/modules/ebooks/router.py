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


def _safe_org_data(org: OrganizationService, region_id: str) -> dict | None:
    """연간 보고서 조직현황용 조직 데이터 — 실패해도 렌더는 계속."""
    try:
        return org.search(region_id)
    except Exception:
        return None


def _safe_major_map(kanban: KanbanBoardService, region_id: str) -> dict | None:
    """업무(task_id) → 대분류(사업명) 맵 — 연간 보고서 사업명별 그룹화용."""
    try:
        index = kanban.build_task_meta_index(region_id)
        return {
            tid: meta.get("majorCategory")
            for tid, meta in index.items()
            if meta.get("majorCategory")
        }
    except Exception:
        return None

router = APIRouter(tags=["ebooks"])


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


@router.post("/ebooks/upload", status_code=status.HTTP_201_CREATED)
async def upload_ebook_pdf(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    title: Annotated[str, Form()] = "",
    team: Annotated[str, Form()] = "",
    category: Annotated[str, Form()] = "운영보고서",
    file: UploadFile = File(...),
):
    """PDF 한 권을 신규 도서로 등록(전자책 목록에 추가·열람)."""
    filename = file.filename or "도서.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF 파일만 등록할 수 있습니다.",
        )
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="빈 PDF 파일입니다.",
        )
    return service.create_ebook_with_pdf(
        region_id,
        title=title.strip() or Path(filename).stem,
        team=team.strip(),
        category=(category or "").strip() or "운영보고서",
        filename=filename,
        content=content,
        content_type=file.content_type,
    )


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


# 정적 경로(category-styles·suggested-questions) 뒤에 둬야 가로채지 않음
@router.get("/ebooks/{ebook_id}")
def get_ebook(
    ebook_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.get_ebook(region_id, ebook_id)


@router.get("/ebooks/{ebook_id}/html")
def get_ebook_html(
    ebook_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    org: OrganizationService = Depends(get_organization_service),
    kanban: KanbanBoardService = Depends(get_kanban_service),
):
    """연간 보고서 책자를 디자인된 HTML로 렌더(전자책자 열람용)."""
    html = service.build_annual_report_html(
        region_id,
        ebook_id,
        org_data=_safe_org_data(org, region_id),
        major_category_map=_safe_major_map(kanban, region_id),
    )
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.get("/ebooks/{ebook_id}/pdf")
def get_ebook_pdf(
    ebook_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    org: OrganizationService = Depends(get_organization_service),
):
    """전자책 PDF 열람 — 업로드 도서는 원본 PDF, 연간 보고서는 동적 렌더."""
    payload, _filename = service.get_ebook_pdf_payload(
        region_id, ebook_id, org_data=_safe_org_data(org, region_id)
    )
    return Response(
        content=payload,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'inline; filename="ebook.pdf"',
            "Content-Length": str(len(payload)),
        },
    )
