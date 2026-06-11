"""HWPX 문서 자동화 — 업로드 파싱 · 편집 JSON · HWPX 재생성."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

from app.common.hwpx.automation.pipeline import (
    extract_hwpx,
    hwpx_xml_to_json,
    make_render_json,
    normalize_render_json_for_frontend,
)


class HwpxAutomationService:
    """week09 step1 파이프라인을 API용으로 감싼 서비스."""

    def parse_hwpx_bytes(
        self,
        hwpx_bytes: bytes,
        *,
        source_filename: str = "document.hwpx",
    ) -> dict[str, Any]:
        """HWPX → 프론트엔드 렌더링용 JSON."""
        if not hwpx_bytes:
            raise ValueError("HWPX 파일이 비어 있습니다.")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            hwpx_path = tmp_path / "input.hwpx"
            hwpx_path.write_bytes(hwpx_bytes)

            xml_dir = tmp_path / "xml"
            extract_hwpx(hwpx_path, xml_dir)

            json_path = tmp_path / "file.json"
            hwpx_xml_to_json(xml_dir, json_path)

            render_json_path = tmp_path / "render.json"
            render_json = make_render_json(json_path, render_json_path)

            frontend_json = normalize_render_json_for_frontend(render_json)

        stem = Path(source_filename).stem or "document"
        return {
            "frontendJson": frontend_json,
            "sourceFilename": source_filename,
            "documentTitle": stem,
        }

    def export_hwpx_bytes(
        self,
        hwpx_bytes: bytes,
        frontend_json: dict[str, Any],
        *,
        download_filename: str = "result.hwpx",
    ) -> bytes:
        """편집된 frontend JSON을 원본 HWPX에 '절대 보존'으로 반영.

        Contents/section0.xml 만 교체하고 나머지 ZIP 항목은 원본 바이트를 그대로 보존한다
        (mimetype·header.xml·settings.xml·BinData·Preview 등). 변경이 없으면 원본 그대로 반환.
        """
        from app.common.hwpx.automation.section0_writeback import (
            export_hwpx_preserving,
        )

        return export_hwpx_preserving(hwpx_bytes, frontend_json)

    @staticmethod
    def parse_frontend_json_field(raw: str) -> dict[str, Any]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("frontendJson 형식이 올바르지 않습니다.") from exc

        if not isinstance(data, dict):
            raise ValueError("frontendJson은 객체여야 합니다.")

        return data

    def analyze_document_bytes(
        self,
        data: bytes,
        *,
        source_filename: str,
        relative_path: str = "",
    ) -> dict[str, Any]:
        from app.common.hwpx.automation.evidence_analyzer import (
            analyze_document_bytes,
        )

        return analyze_document_bytes(
            data,
            source_filename=source_filename,
            relative_path=relative_path,
        )
