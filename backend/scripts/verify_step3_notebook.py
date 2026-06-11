"""
step3_rendering_hwpx.ipynb 재현 — make_render_json + render_json_to_html.

  py -3 scripts/verify_step3_notebook.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.common.hwpx.render.apply_form import apply_plan_form
from app.common.hwpx.render.file_json_render import make_file_json_from_bytes
from app.common.hwpx.render.html_preview import render_json_to_html
from app.common.hwpx.render.render_json_builder import make_render_json
from app.common.hwpx.render.template_registry import load_render_template_bytes

OUT = ROOT / "_hwpx_verify_out"
TEMPLATE_HWPX = ROOT / "HWPX_TEMPLATES" / "ex_사업계획서(2).hwpx"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    hwpx_bytes = (
        load_render_template_bytes("plan")
        if not TEMPLATE_HWPX.is_file()
        else TEMPLATE_HWPX.read_bytes()
    )

    file_json = make_file_json_from_bytes(hwpx_bytes, template_kind="plan")
    render_json = make_render_json(file_json, template_kind="plan", include_tables=True)

    (OUT / "step3_plan_render.json").write_text(
        json.dumps(render_json, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    html = render_json_to_html(render_json)
    (OUT / "step3_plan_preview.html").write_text(html, encoding="utf-8")

    paragraphs = render_json.get("document", {}).get("paragraphs", [])
    assert render_json.get("type") == "hwpx_render_json"
    assert paragraphs, "paragraphs empty"
    assert render_json.get("maps", {}).get("char_styles"), "char_styles missing"
    assert render_json.get("maps", {}).get("border_fills"), "border_fills missing"

    table_runs = [
        r
        for p in paragraphs
        for r in p.get("runs", [])
        if r.get("type") == "table"
    ]
    print(f"paragraphs={len(paragraphs)} table_runs={len(table_runs)}")

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
    filled = apply_plan_form(file_json, form, template_kind="plan")
    filled_render = make_render_json(filled, template_kind="plan")
    filled_html = render_json_to_html(filled_render)
    (OUT / "step3_plan_filled.html").write_text(filled_html, encoding="utf-8")

    assert "치환 테스트" in filled_html
    assert "background-color:#D9D9D9" in html or "background-color:#d9d9d9" in html.lower()
    assert "background-color:#FFFFFF" in filled_html or "background-color:#ffffff" in filled_html.lower()
    assert "hwpx-doc__label" in filled_html
    assert "text-align:center" in html
    print("OK step3_plan_render.json, step3_plan_preview.html, step3_plan_filled.html")
    print("검증 완료 — step3_rendering_hwpx.ipynb 흐름과 동일합니다.")


if __name__ == "__main__":
    main()
