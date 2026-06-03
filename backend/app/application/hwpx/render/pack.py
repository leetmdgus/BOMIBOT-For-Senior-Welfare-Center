"""step2_데이터 치환하기.ipynb — json_to_hwpx / zip_hwpx_dir."""

from __future__ import annotations

import io
import tempfile
from pathlib import Path
from shutil import copytree
from typing import Mapping
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile

from app.application.hwpx.render.json_tree import write_json_xml_parts_bytes
from app.application.hwpx.zip_package import pack_hwpx_zip_bytes


def json_to_hwpx_bytes(
    template_hwpx: bytes,
    file_json: dict,
    *,
    extra_files: Mapping[str, bytes] | None = None,
) -> bytes:
    """
    step2 `json_to_hwpx` — JSON 3파트(section/header/settings)를 XML로 쓰고 ZIP.

    노트북은 template_dir 복사 후 write_json_xml_parts + zip_hwpx_dir.
    여기서는 템플릿 ZIP 골격 유지 + pack_hwpx_zip_bytes(원본 압축 스트림 복사).
    """
    replacements = write_json_xml_parts_bytes(file_json)
    if extra_files:
        replacements.update(dict(extra_files))
    return pack_hwpx_zip_bytes(template_hwpx, replacements)


def zip_hwpx_dir(source_dir: Path, output_hwpx: Path) -> Path:
    """step2 zip_hwpx_dir — mimetype STORED, 나머지 DEFLATED (디버그용)."""
    output_hwpx.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output_hwpx, "w") as zf:
        mimetype = source_dir / "mimetype"
        if mimetype.is_file():
            zf.write(mimetype, "mimetype", compress_type=ZIP_STORED)
        for file in source_dir.rglob("*"):
            if not file.is_file():
                continue
            rel = file.relative_to(source_dir).as_posix()
            if rel == "mimetype":
                continue
            zf.write(file, rel, compress_type=ZIP_DEFLATED)
    return output_hwpx


def json_to_hwpx_path(
    file_json: dict,
    template_dir: Path,
    output_hwpx: Path,
) -> Path:
    """
    step2 json_to_hwpx — 디렉터리 템플릿 + write_json_xml_parts + zip_hwpx_dir.

    노트북 cell 3·4와 동일 흐름 (파일 출력).
    """
    from app.application.hwpx.render.json_tree import json_part_to_bytes

    template_dir = Path(template_dir)
    output_hwpx = Path(output_hwpx)

    with tempfile.TemporaryDirectory() as temp_dir:
        work_dir = Path(temp_dir) / "hwpx"
        copytree(template_dir, work_dir)

        targets = {
            "section": work_dir / "Contents" / "section0.xml",
            "header": work_dir / "Contents" / "header.xml",
            "settings": work_dir / "settings.xml",
        }
        for key, path in targets.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            part = json_data[key]
            path.write_bytes(
                json_part_to_bytes(part["data"], nsmap=part.get("nsmap"))
            )

        zip_hwpx_dir(work_dir, output_hwpx)

    return output_hwpx


def xml_to_hwpx_bytes(
    template_hwpx: bytes,
    xml_replacements: Mapping[str, bytes],
) -> bytes:
    """section0 등 일부만 교체 (PrvText 등 extra 포함)."""
    return pack_hwpx_zip_bytes(template_hwpx, dict(xml_replacements))
