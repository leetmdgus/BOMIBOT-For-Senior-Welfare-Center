"""HWPX XML → file_json (step2 — 네임스페이스·tail 보존)."""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any
from zipfile import ZipFile

from lxml import etree

from app.application.hwpx.render.json_tree import local_tag, xml_to_dict


def _part_nsmap(root: etree._Element) -> dict[str, str]:
    return {k: v for k, v in (root.nsmap or {}).items() if k is not None and v}


def hwpx_bytes_to_file_json(hwpx_bytes: bytes) -> dict[str, Any]:
    targets = {
        "section": "Contents/section0.xml",
        "header": "Contents/header.xml",
        "settings": "settings.xml",
    }
    out: dict[str, Any] = {}
    with ZipFile(io.BytesIO(hwpx_bytes)) as zf:
        for name, path in targets.items():
            raw = zf.read(path)
            root = etree.fromstring(raw)
            out[name] = {
                "source_path": path,
                "root_tag": root.tag,
                "nsmap": _part_nsmap(root),
                "data": xml_to_dict(root),
            }
    return out


def hwpx_path_to_file_json(hwpx_path: Path) -> dict[str, Any]:
    return hwpx_bytes_to_file_json(hwpx_path.read_bytes())


def hwpx_xml_to_json(
    xml_dir: str | Path,
    save_path: str | Path | None = None,
) -> dict[str, Any]:
    xml_dir = Path(xml_dir)
    targets = {
        "section": xml_dir / "Contents" / "section0.xml",
        "header": xml_dir / "Contents" / "header.xml",
        "settings": xml_dir / "settings.xml",
    }
    result: dict[str, Any] = {}
    for name, path in targets.items():
        if not path.is_file():
            raise FileNotFoundError(f"필수 XML이 없습니다: {path}")
        root = etree.parse(str(path)).getroot()
        result[name] = {
            "source_path": str(path),
            "root_tag": root.tag,
            "nsmap": _part_nsmap(root),
            "data": xml_to_dict(root),
        }
    if save_path is not None:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    return result
