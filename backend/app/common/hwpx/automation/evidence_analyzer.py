"""증빙·문서 파일 분석 (HWPX / Office 미리보기)."""

from __future__ import annotations

import base64
import re
from pathlib import Path
from typing import Any

from app.modules.files.document_preview import render_document_preview_fragment
from app.common.hwpx.automation.service import HwpxAutomationService
from app.common.hwpx.hwpx_package import is_hwpx_filename
from app.common.hwpx.rhwp_render import (
    RhwpNotAvailableError,
    RhwpRenderError,
    convert_to_hwpx_bytes,
)

_SUPPORTED = {
    ".hwpx",
    ".hwp",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".csv",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
}

_hwpx_service = HwpxAutomationService()


def is_supported_evidence_filename(filename: str) -> bool:
    return Path(filename or "").suffix.lower() in _SUPPORTED


def _extract_plain_text_from_frontend_json(data: dict[str, Any]) -> str:
    parts: list[str] = []

    def walk_paragraphs(paragraphs: list[dict[str, Any]] | None) -> None:
        if not paragraphs:
            return
        for paragraph in paragraphs:
            for run in paragraph.get("runs") or []:
                if run.get("type") == "text_run":
                    text = str(run.get("text") or "").strip()
                    if text:
                        parts.append(text)
                elif run.get("type") == "table":
                    for row in run.get("rows") or []:
                        for cell in row.get("cells") or []:
                            walk_paragraphs(cell.get("paragraphs"))

    document = data.get("document") or {}
    walk_paragraphs(document.get("paragraphs"))
    return "\n".join(parts)


def _strip_html(html: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def analyze_document_bytes(
    data: bytes,
    *,
    source_filename: str,
    relative_path: str = "",
) -> dict[str, Any]:
    if not data:
        raise ValueError("파일이 비어 있습니다.")

    filename = source_filename or "document"
    path = relative_path or filename
    suffix = Path(filename).suffix.lower()

    if not is_supported_evidence_filename(filename):
        return {
            "path": path,
            "filename": filename,
            "kind": "unsupported",
            "supported": False,
            "summary": f"지원하지 않는 형식입니다: {suffix or '(확장자 없음)'}",
            "previewHtml": None,
            "frontendJson": None,
            "plainText": "",
            "stats": {"sizeBytes": len(data)},
        }

    is_hwp_binary = suffix == ".hwp" and not is_hwpx_filename(filename)

    if is_hwpx_filename(filename) or is_hwp_binary:
        working_filename = filename
        working_bytes = data
        working_file_payload: dict[str, Any] | None = None

        # .hwp(바이너리)는 편집 파이프라인(HWPX 전용)에 태우기 위해 rhwp로 HWPX 변환.
        # 변환본을 프론트가 작업 파일로 채택하도록 base64로 함께 반환한다.
        if is_hwp_binary:
            try:
                working_bytes = convert_to_hwpx_bytes(data, suffix=".hwp")
            except (RhwpNotAvailableError, RhwpRenderError) as exc:
                return {
                    "path": path,
                    "filename": filename,
                    "kind": "hwp",
                    "supported": False,
                    "summary": (
                        "HWP(.hwp) 편집은 rhwp 변환이 필요합니다. "
                        f"변환에 실패했습니다: {exc}"
                    ),
                    "previewHtml": None,
                    "frontendJson": None,
                    "plainText": "",
                    "stats": {"sizeBytes": len(data)},
                }
            working_filename = f"{Path(filename).stem or 'document'}.hwpx"
            working_file_payload = {
                "filename": working_filename,
                "contentBase64": base64.b64encode(working_bytes).decode("ascii"),
            }

        parsed = _hwpx_service.parse_hwpx_bytes(
            working_bytes, source_filename=working_filename
        )
        frontend_json = parsed["frontendJson"]
        plain_text = _extract_plain_text_from_frontend_json(frontend_json)
        paragraphs = (frontend_json.get("document") or {}).get("paragraphs") or []
        source_label = "HWP→HWPX" if is_hwp_binary else "HWPX"
        return {
            "path": path,
            "filename": filename,
            "kind": "hwpx",
            "supported": True,
            "summary": (
                f"{source_label} 문서 · 문단 {len(paragraphs)}개 · "
                f"텍스트 {len(plain_text):,}자"
            ),
            "previewHtml": None,
            "frontendJson": frontend_json,
            "plainText": plain_text[:8000],
            "stats": {
                "sizeBytes": len(data),
                "paragraphCount": len(paragraphs),
                "textLength": len(plain_text),
            },
            "documentTitle": parsed.get("documentTitle"),
            # .hwp 변환 시에만: 프론트가 이후 렌더/내보내기에 쓸 HWPX 작업 파일
            "workingFile": working_file_payload,
        }

    preview_html = render_document_preview_fragment(data, filename)
    plain_text = _strip_html(preview_html)[:8000]

    kind_map = {
        ".docx": "docx",
        ".doc": "doc",
        ".xlsx": "xlsx",
        ".xls": "xls",
        ".csv": "csv",
        ".pdf": "pdf",
    }
    kind = kind_map.get(suffix, "image" if suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp"} else "office")

    summary = f"{suffix.lstrip('.').upper()} 문서 · {len(data):,} bytes"
    if plain_text:
        summary += f" · 추출 텍스트 {len(plain_text):,}자"

    return {
        "path": path,
        "filename": filename,
        "kind": kind,
        "supported": True,
        "summary": summary,
        "previewHtml": preview_html,
        "frontendJson": None,
        "plainText": plain_text,
        "stats": {
            "sizeBytes": len(data),
            "textLength": len(plain_text),
        },
    }
