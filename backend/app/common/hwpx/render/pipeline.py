"""
HWPX 파이프라인 — step2(치환) + step3(렌더링) + HWPX 다운로드.

step2_데이터 치환하기.ipynb
  1. extract_hwpx
  2. hwpx_xml_to_json → file_json
  3. apply_plan_form / apply_evaluation_form
  4. json_to_hwpx (미리보기용 roundtrip)

step3_rendering_hwpx.ipynb
  5. make_render_json → render 필드
  6. render_json_to_html → 프론트/API 미리보기
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.common.hwpx.render.apply_form import apply_evaluation_form, apply_plan_form
from app.common.hwpx.render.extract import extract_hwpx
from app.common.hwpx.render.file_json_render import (
    attach_render_field,
    make_file_json_from_bytes,
    preview_from_file_json,
)
from app.common.hwpx.render.hwpx_json import hwpx_bytes_to_file_json, hwpx_xml_to_json
from app.common.hwpx.render.json_tree import write_json_xml_parts_bytes
from app.common.hwpx.render.pack import json_to_hwpx_bytes
from app.common.hwpx.render.template_registry import (
    HwpxRenderTemplateKind,
    load_render_template_bytes,
    render_template_hwpx_path,
)

__all__ = [
    "extract_hwpx",
    "hwpx_xml_to_json",
    "hwpx_bytes_to_file_json",
    "make_file_json_from_bytes",
    "apply_plan_form",
    "apply_evaluation_form",
    "preview_from_file_json",
    "build_hwpx_from_file_json",
    "build_file_json_from_template",
]


def build_file_json_from_template(kind: HwpxRenderTemplateKind) -> dict[str, Any]:
    return make_file_json_from_bytes(load_render_template_bytes(kind), template_kind=kind)


def build_hwpx_from_file_json(
    kind: HwpxRenderTemplateKind,
    file_json: dict[str, Any],
    *,
    extra_files: dict[str, bytes] | None = None,
) -> bytes:
    """step2 json_to_hwpx — section/header/settings 3파트 직렬화 후 ZIP."""
    return json_to_hwpx_bytes(
        load_render_template_bytes(kind),
        file_json,
        extra_files=extra_files,
    )


def default_template_path(kind: HwpxRenderTemplateKind) -> Path:
    return render_template_hwpx_path(kind)
