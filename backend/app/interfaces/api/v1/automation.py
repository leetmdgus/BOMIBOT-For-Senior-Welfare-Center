from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.application.http.content_disposition import attachment_content_disposition
from app.application.hwpx.automation.service import HwpxAutomationService
from app.application.hwpx.hwpx_package import is_hwpx_filename
from app.interfaces.api.deps import require_region_id

router = APIRouter(prefix="/automation", tags=["automation"])

_service = HwpxAutomationService()


async def _read_hwpx_upload(file: UploadFile) -> tuple[bytes, str]:
    filename = file.filename or "document.hwpx"
    if not is_hwpx_filename(filename):
        raise HTTPException(
            status_code=400,
            detail="HWPX 파일(.hwpx)만 업로드할 수 있습니다.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="업로드된 파일이 비어 있습니다.")

    return data, filename


@router.post("/hwpx/parse")
async def parse_hwpx_document(
    region_id: str = Depends(require_region_id),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    del region_id

    hwpx_bytes, filename = await _read_hwpx_upload(file)

    try:
        return _service.parse_hwpx_bytes(hwpx_bytes, source_filename=filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"HWPX 파싱 중 오류가 발생했습니다: {exc}",
        ) from exc


@router.post("/hwpx/export")
async def export_hwpx_document(
    region_id: str = Depends(require_region_id),
    file: UploadFile = File(...),
    # 프론트는 multipart 필드명을 camelCase(frontendJson)로 전송 — alias로 바인딩
    frontend_json: Annotated[str, Form(alias="frontendJson")] = "",
    download_filename: Annotated[str | None, Form()] = None,
) -> Response:
    del region_id

    hwpx_bytes, source_filename = await _read_hwpx_upload(file)

    if not frontend_json.strip():
        raise HTTPException(status_code=400, detail="frontendJson 필드가 필요합니다.")

    try:
        parsed_json = _service.parse_frontend_json_field(frontend_json)
        payload = _service.export_hwpx_bytes(
            hwpx_bytes,
            parsed_json,
            download_filename=download_filename or source_filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"HWPX 생성 중 오류가 발생했습니다: {exc}",
        ) from exc

    out_name = download_filename or source_filename
    if not out_name.lower().endswith(".hwpx"):
        out_name = f"{out_name}.hwpx"

    return Response(
        content=payload,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": attachment_content_disposition(out_name),
        },
    )


@router.post("/documents/analyze")
async def analyze_evidence_document(
    region_id: str = Depends(require_region_id),
    file: UploadFile = File(...),
    relative_path: Annotated[str, Form()] = "",
) -> dict[str, Any]:
    del region_id

    filename = file.filename or "document"
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="업로드된 파일이 비어 있습니다.")

    path = (relative_path or filename).replace("\\", "/")

    try:
        return _service.analyze_document_bytes(
            data,
            source_filename=filename,
            relative_path=path,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"문서 분석 중 오류가 발생했습니다: {exc}",
        ) from exc


@router.get("/documents/supported-extensions")
def list_supported_document_extensions(
    region_id: str = Depends(require_region_id),
) -> dict[str, Any]:
    del region_id

    from app.application.hwpx.automation.evidence_analyzer import _SUPPORTED

    return {
        "extensions": sorted(_SUPPORTED),
        "hwpxOnly": [".hwpx"],
        "office": [".docx", ".doc", ".xlsx", ".xls", ".csv"],
        "image": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    }
