"""step3 make_render_json — file_json.render 필드."""

from __future__ import annotations

import copy
from typing import Any

from app.common.hwpx.render.render_json_builder import make_render_json


def build_render_field(
    file_json: dict[str, Any],
    *,
    template_kind: str,
) -> dict[str, Any]:
    """step3_rendering_hwpx.ipynb `make_render_json` (+ step4 표)."""
    return make_render_json(file_json, template_kind=template_kind, include_tables=True)


def attach_render_field(
    file_json: dict[str, Any],
    *,
    template_kind: str,
) -> dict[str, Any]:
    """file_json에 render 필드 갱신 (step2 치환 후 미리보기 동기화)."""
    file_json["render"] = build_render_field(file_json, template_kind=template_kind)
    return file_json


def make_file_json_from_bytes(hwpx_bytes: bytes, *, template_kind: str) -> dict[str, Any]:
    from app.common.hwpx.render.hwpx_json import hwpx_bytes_to_file_json

    doc = copy.deepcopy(hwpx_bytes_to_file_json(hwpx_bytes))
    attach_render_field(doc, template_kind=template_kind)
    return doc


def preview_from_file_json(file_json: dict[str, Any]) -> dict[str, Any]:
    """API/프론트용 render_json (render 필드)."""
    return dict(file_json.get("render") or {})
