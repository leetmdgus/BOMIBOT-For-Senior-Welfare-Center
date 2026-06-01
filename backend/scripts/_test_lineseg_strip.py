# -*- coding: utf-8 -*-
from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.application.hwpx.render.json_tree import _HWPX_XML_DECL
from app.application.hwpx.render.template_registry import load_render_template_bytes
from app.application.hwpx.section0_template_fill import (
    HP_NS,
    _direct_table_paragraphs,
    _fill_plan_main_table,
)

HP = f"{{{HP_NS}}}"


def fill_and_strip(section0: bytes, form: dict) -> bytes:
    root = etree.fromstring(section0)
    paras = _direct_table_paragraphs(root)
    if paras:
        main_tbl = paras[0].find(f".//{HP}tbl")
        if main_tbl is not None:
            _fill_plan_main_table(main_tbl, form)
            for ls in main_tbl.findall(f".//{HP}linesegarray"):
                parent = ls.getparent()
                if parent is not None:
                    parent.remove(ls)
    body = etree.tostring(root, encoding="utf-8", xml_declaration=False, pretty_print=False)
    return _HWPX_XML_DECL + body


def main() -> None:
    template = load_render_template_bytes("plan")
    with zipfile.ZipFile(io.BytesIO(template)) as zf:
        section0 = zf.read("Contents/section0.xml")

    form = {
        "projectName": "치환 테스트",
        "purpose": "목적",
        "goals": ["목표1"],
        "period": "2026",
        "target": "대상",
        "totalCount": "100",
        "budget": "1000",
        "budgetCategory": "인건비",
        "manager": "홍길동",
        "subProjects": [],
    }
    out = fill_and_strip(section0, form)
    text = out.decode("utf-8")
    print("hp:" in text, "ns0:" in text)
    print("lineseg left", text.count("linesegarray"))
    print("project", "치환 테스트" in text)
    print("len", len(section0), "->", len(out))

    out_path = ROOT / "_hwpx_verify_out" / "plan_lineseg_stripped.hwpx"
    from app.application.hwpx.section0_byte_fill import rebuild_plan_prv_bytes
    from app.application.hwpx.render.byte_pack import pack_render_hwpx_bytes
    from app.application.hwpx.zip_package import pack_hwpx_zip_bytes

    with zipfile.ZipFile(io.BytesIO(template)) as zf:
        prv = zf.read("Preview/PrvText.txt")
    prv_out = rebuild_plan_prv_bytes(prv, form)
    hwpx = pack_hwpx_zip_bytes(
        template,
        {
            "Contents/section0.xml": out,
            "Preview/PrvText.txt": prv_out,
        },
    )
    out_path.write_bytes(hwpx)
    print("wrote", out_path, len(hwpx))


if __name__ == "__main__":
    main()
