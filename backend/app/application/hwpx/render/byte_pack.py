"""HWPX 다운로드 — section0/PrvText 바이트 치환 (한컴 변조 검사 대응)."""

from __future__ import annotations

import io
import zipfile
from typing import Any

from app.application.hwpx.hwpx_image_embed import patch_content_hpf, patch_header_bindata
from app.application.hwpx.render.template_registry import (
    HwpxRenderTemplateKind,
    load_render_template_bytes,
)
from app.application.hwpx.section0_byte_fill import (
    build_evaluation_section0_for_download,
    build_plan_section0_for_download,
    rebuild_evaluation_prv_bytes,
    rebuild_plan_prv_bytes,
)
from app.application.hwpx.zip_package import pack_hwpx_zip_bytes


def pack_render_hwpx_bytes(
    kind: HwpxRenderTemplateKind,
    *,
    form_data: dict[str, Any] | None = None,
    evaluation: dict[str, Any] | None = None,
    sections: list[dict[str, Any]] | None = None,
) -> bytes:
    """
    템플릿 ZIP 골격 유지 + section0.xml·PrvText.txt 치환.

    section0: 표 채움 후 hp:linesegarray 제거 (한글 변조 검사 대응).
    PrvText: rebuild_plan_prv_bytes 줄 단위 동기화.
    """
    template = load_render_template_bytes(kind)
    with zipfile.ZipFile(io.BytesIO(template)) as zf:
        section0 = zf.read("Contents/section0.xml")
        prv = zf.read("Preview/PrvText.txt")
        header = zf.read("Contents/header.xml")
        content_hpf = zf.read("Contents/content.hpf")

    if kind == "plan":
        form = form_data or {}
        built = build_plan_section0_for_download(
            section0, form, sections=sections
        )
        prv_out = rebuild_plan_prv_bytes(prv, form, sections=sections)
    else:
        evaluation_data = evaluation or {}
        built = build_evaluation_section0_for_download(section0, evaluation_data)
        prv_out = rebuild_evaluation_prv_bytes(prv, evaluation_data)

    file_contents: dict[str, bytes] = {
        "Contents/section0.xml": built.section0,
        "Preview/PrvText.txt": prv_out,
    }
    extra_files: dict[str, bytes] = {}

    allow_paths: set[str] = set()
    if built.image_catalog.has_images:
        file_contents["Contents/header.xml"] = patch_header_bindata(
            header, built.image_catalog
        )
        file_contents["Contents/content.hpf"] = patch_content_hpf(
            content_hpf, built.image_catalog
        )
        extra_files = built.image_catalog.bin_files()
        # header.xml/content.hpf는 보호 경로 — 이미지 binData/manifest를 일관 갱신했으므로 교체 허용
        allow_paths = {"Contents/header.xml", "Contents/content.hpf"}

    return pack_hwpx_zip_bytes(
        template,
        file_contents,
        extra_files=extra_files,
        allow_template_paths=allow_paths,
    )
