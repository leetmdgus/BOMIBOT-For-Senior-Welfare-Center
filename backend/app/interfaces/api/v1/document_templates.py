"""사용자 업로드 문서 양식(템플릿) API.

흐름:
    POST   /document-templates              양식 업로드(.hwpx) → 파싱·보관 → 메타
    GET    /document-templates              목록("이전 양식 불러오기")
    GET    /document-templates/{id}         메타 + 편집용 frontendJson(재파싱)
    DELETE /document-templates/{id}         삭제(원본 bytes 포함)
    POST   /document-templates/{id}/export  채운 frontendJson → 원본에 반영한 HWPX 다운로드
"""

from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.application.http.content_disposition import attachment_content_disposition
from app.application.services.region_store_service import RegionStoreService
from app.interfaces.api.deps import (
    get_region_store_service,
    optional_user_display_name,
    require_region_id,
)

router = APIRouter(prefix="/document-templates", tags=["document-templates"])


@router.get("")
def list_templates(
    region_id: str = Depends(require_region_id),
    store: RegionStoreService = Depends(get_region_store_service),
) -> dict[str, Any]:
    return {"templates": store.list_document_templates(region_id)}


@router.post("", status_code=201)
async def upload_template(
    region_id: str = Depends(require_region_id),
    store: RegionStoreService = Depends(get_region_store_service),
    created_by: str = Depends(optional_user_display_name),
    file: UploadFile = File(...),
    name: Annotated[str | None, Form()] = None,
    kind: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    content = await file.read()
    filename = file.filename or "template.hwpx"
    return store.create_document_template(
        region_id,
        filename=filename,
        content=content,
        created_by=created_by,
        name=name,
        kind=kind,
    )


@router.get("/{template_id}")
def get_template(
    template_id: str,
    region_id: str = Depends(require_region_id),
    store: RegionStoreService = Depends(get_region_store_service),
) -> dict[str, Any]:
    return store.get_document_template(region_id, template_id)


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    region_id: str = Depends(require_region_id),
    store: RegionStoreService = Depends(get_region_store_service),
) -> dict[str, Any]:
    return store.delete_document_template(region_id, template_id)


@router.post("/{template_id}/prefill")
def prefill_template(
    template_id: str,
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    store: RegionStoreService = Depends(get_region_store_service),
) -> dict[str, Any]:
    """업로드 양식에 계획/평가 값을 라벨 매칭으로 채운 frontendJson 반환(WYSIWYG 초기값)."""
    kind = str(body.get("kind") or "plan")
    data = body.get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="data(계획/평가 값) 객체가 필요합니다.")
    frontend_json = store.prefill_document_template(
        region_id, template_id, kind=kind, data=data
    )
    return {"frontendJson": frontend_json}


@router.post("/{template_id}/export")
async def export_template(
    template_id: str,
    region_id: str = Depends(require_region_id),
    store: RegionStoreService = Depends(get_region_store_service),
    frontend_json: Annotated[str, Form(alias="frontendJson")] = "",
    sections_json: Annotated[str | None, Form(alias="sections")] = None,
    download_filename: Annotated[str | None, Form(alias="downloadFilename")] = None,
) -> Response:
    if not frontend_json.strip():
        raise HTTPException(status_code=400, detail="frontendJson 필드가 필요합니다.")
    try:
        parsed = json.loads(frontend_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400, detail="frontendJson 형식이 올바르지 않습니다."
        ) from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="frontendJson 은 객체여야 합니다.")

    sections: list[dict[str, Any]] | None = None
    if sections_json and sections_json.strip():
        try:
            raw_sections = json.loads(sections_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=400, detail="sections 형식이 올바르지 않습니다."
            ) from exc
        if isinstance(raw_sections, list):
            sections = [s for s in raw_sections if isinstance(s, dict)]

    payload, out_name = store.export_document_template(
        region_id, template_id, parsed, sections=sections
    )
    if download_filename:
        out_name = download_filename
        if not out_name.lower().endswith(".hwpx"):
            out_name = f"{out_name}.hwpx"

    return Response(
        content=payload,
        media_type="application/octet-stream",
        headers={"Content-Disposition": attachment_content_disposition(out_name)},
    )
