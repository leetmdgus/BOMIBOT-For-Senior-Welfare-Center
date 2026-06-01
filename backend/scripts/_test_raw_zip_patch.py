# -*- coding: utf-8 -*-
"""Test in-place raw ZIP patching without recompression."""
from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.application.hwpx.render.template_registry import load_render_template_bytes
from app.application.hwpx.section0_byte_fill import (
    HP_T_CLOSE,
    _apply_patches,
    build_plan_byte_patches,
    rebuild_plan_prv_bytes,
)

OUT = ROOT / "_hwpx_verify_out"


def main() -> None:
    template = load_render_template_bytes("plan")
    with zipfile.ZipFile(io.BytesIO(template)) as zf:
        section0 = zf.read("Contents/section0.xml")
        prv = zf.read("Preview/PrvText.txt")

    old_name = "일반상담 및 정보제공사업"
    print("old_name in section0:", old_name in section0.decode("utf-8"))
    print("old_name in raw zip:", old_name.encode("utf-8") in template)

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
    patches = build_plan_byte_patches(form, section0=section0, prv=prv)
    s0_out = _apply_patches(
        section0,
        [p for p in patches if HP_T_CLOSE in p.old],
        unique_only=False,
    )
    prv_out = rebuild_plan_prv_bytes(prv, form)

    # Try patch compressed streams in raw zip by replacing uncompressed substrings
    # only if they appear literally (they won't in deflate)
    for label, old_b, new_b in [
        ("section0", section0, s0_out),
        ("prv", prv, prv_out),
    ]:
        if old_b == new_b:
            print(label, "unchanged")
            continue
        if old_b in template:
            print(label, "old uncompressed bytes found in zip!")
        else:
            print(label, "old NOT in raw zip (deflated)")

    # Validate UTF-8 validity after patches
    for label, data in [("s0", s0_out), ("prv", prv_out)]:
        try:
            data.decode("utf-8")
            print(label, "valid utf-8")
        except UnicodeDecodeError as e:
            print(label, "INVALID utf-8", e)

    # Check for broken utf-8 at truncation boundaries in hp:t nodes
    import re

    s0_text = s0_out.decode("utf-8")
    for m in re.finditer(r">([^<]*)</hp:t>", s0_text):
        chunk = m.group(1).encode("utf-8")
        try:
            chunk.decode("utf-8")
        except UnicodeDecodeError:
            print("bad hp:t chunk", repr(m.group(1)[:40]))


if __name__ == "__main__":
    main()
