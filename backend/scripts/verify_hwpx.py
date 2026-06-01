"""HWPX 생성물 검증 — ZIP·XML·템플릿 일치 확인."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.application.hwpx.builder import (  # noqa: E402
    _build_content_hpf,
    _build_preview_text,
    _build_section0_xml,
    build_hwpx_bytes,
)
from app.application.hwpx.export_business_plan import build_business_plan_hwpx  # noqa: E402
from app.application.hwpx.zip_package import pack_hwpx_zip  # noqa: E402

TEMPLATE = ROOT / "app/application/hwpx/templates/base.hwpx"
REF = ROOT.parent / "frontend-next/scripts/test-plan.hwpx"


def _check_zip(path: Path, label: str) -> list[str]:
    errors: list[str] = []
    data = path.read_bytes()
    if data[:2] != b"PK":
        errors.append(f"{label}: not a ZIP file")
        return errors

    with zipfile.ZipFile(path) as zf:
        bad = zf.testzip()
        if bad:
            errors.append(f"{label}: corrupt zip entry {bad}")

        names = [i.filename.replace("\\", "/") for i in zf.infolist()]
        if names[0] != "mimetype":
            errors.append(f"{label}: first entry must be mimetype, got {names[0]}")
        mt = zf.read("mimetype")
        if mt != b"application/hwp+zip":
            errors.append(f"{label}: bad mimetype {mt!r}")

        for name in names:
            if name.endswith(".xml") or name.endswith(".hpf"):
                raw = zf.read(name)
                try:
                    etree.fromstring(raw)
                except etree.XMLSyntaxError as exc:
                    errors.append(f"{label}: XML error in {name}: {exc}")

    return errors


def main() -> int:
    form = {
        "projectName": "검증사업",
        "purpose": "목적\n둘째줄",
        "goals": ["목표1", "목표2"],
        "period": "2026.01.01 ~ 2026.12.31",
        "target": "대상",
        "totalCount": "100",
        "budget": "1000",
        "budgetCategory": "인건비",
        "manager": "담당",
        "subProjects": [
            {
                "name": "세부1",
                "output": "산출\n- 항목A",
                "outcome": "성과목표",
            },
            {
                "name": "세부2",
                "output": "산출2",
                "outcome": "성과목표",
            },
        ],
    }
    sections = [
        {
            "type": "table",
            "title": "목표표",
            "content": '{"preset":"purpose-goals"}',
        },
        {"type": "body", "content": "<p>본문 <strong>굵게</strong></p>"},
    ]
    doc = build_business_plan_hwpx(form, sections)
    title = doc.title

    out_dir = ROOT / "_hwpx_verify_out"
    out_dir.mkdir(exist_ok=True)

    full = out_dir / "generated_full.hwpx"
    full.write_bytes(build_hwpx_bytes(doc))

    minimal = out_dir / "generated_minimal.hwpx"
    repl = {
        "Contents/section0.xml": _build_section0_xml(doc.sections).encode("utf-8"),
        "Contents/content.hpf": _build_content_hpf(title).encode("utf-8"),
        "Preview/PrvText.txt": ("\ufeff" + _build_preview_text(doc)).encode("utf-8"),
    }
    minimal.write_bytes(pack_hwpx_zip(repl))

    errors: list[str] = []
    if REF.is_file():
        errors.extend(_check_zip(REF, "reference"))
    if TEMPLATE.is_file():
        errors.extend(_check_zip(TEMPLATE, "template"))
    errors.extend(_check_zip(full, "generated_full"))
    errors.extend(_check_zip(minimal, "generated_minimal"))

    if TEMPLATE.is_file():
        with zipfile.ZipFile(TEMPLATE) as t, zipfile.ZipFile(full) as g:
            t_names = [i.filename for i in t.infolist()]
            g_names = [i.filename for i in g.infolist()]
            if t_names != g_names:
                errors.append(
                    f"entry list mismatch template vs full: {len(t_names)} vs {len(g_names)}"
                )

    if errors:
        print("FAIL")
        for err in errors:
            print(" -", err)
        print(f"output: {out_dir}")
        return 1

    print("OK - all checks passed")
    print(f"  full:    {full} ({full.stat().st_size} bytes)")
    print(f"  minimal: {minimal} ({minimal.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
