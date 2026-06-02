"""HWPX 문서 자동화 — 업로드 파싱 · 편집 JSON · HWPX 재생성."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

from app.application.hwpx.automation.pipeline import (
    extract_hwpx,
    hwpx_xml_to_json,
    make_render_json,
    normalize_render_json_for_frontend,
    render_json_to_xml,
    xml_to_hwpx,
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
        """편집된 frontend JSON 텍스트를 원본 HWPX 템플릿에 반영."""
        if not hwpx_bytes:
            raise ValueError("원본 HWPX 파일이 필요합니다.")
        if not frontend_json:
            raise ValueError("frontendJson이 비어 있습니다.")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            hwpx_path = tmp_path / "template.hwpx"
            hwpx_path.write_bytes(hwpx_bytes)

            xml_dir = tmp_path / "xml"
            extract_hwpx(hwpx_path, xml_dir)

            output_xml = tmp_path / "xml_edit"
            render_json_to_xml(
                frontend_json,
                template_dir=xml_dir,
                output_xml=output_xml,
            )

            output_hwpx = tmp_path / "result.hwpx"
            xml_to_hwpx(output_xml, output_hwpx)

            return output_hwpx.read_bytes()

    @staticmethod
    def parse_frontend_json_field(raw: str) -> dict[str, Any]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("frontendJson 형식이 올바르지 않습니다.") from exc

        if not isinstance(data, dict):
            raise ValueError("frontendJson은 객체여야 합니다.")

        return data
