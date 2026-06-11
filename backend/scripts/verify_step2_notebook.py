"""
step2_데이터 치환하기.ipynb 재현 + 한글/네임스페이스 검증.

  py -3 scripts/verify_step2_notebook.py
"""

from __future__ import annotations

import json
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.common.hwpx.render.apply_form import apply_plan_form
from app.common.hwpx.render.extract import extract_hwpx
from app.common.hwpx.render.file_json_render import make_file_json_from_bytes
from app.common.hwpx.render.hwpx_json import hwpx_xml_to_json
from app.common.hwpx.render.json_tree import local_tag, walk_nodes
from app.common.hwpx.render.pack import json_to_hwpx_bytes
from app.common.hwpx.render.pipeline import build_hwpx_from_file_json
from app.common.hwpx.render.template_registry import load_render_template_bytes

OUT = ROOT / "_hwpx_verify_out"
TEMPLATE_HWPX = ROOT / "HWPX_TEMPLATES" / "ex_사업계획서(2).hwpx"
SAMPLE_NAME = "치환 테스트"


def _first_t_text(section_data: dict, row: int, col: int) -> str:
    tables = [n for n in walk_nodes(section_data) if local_tag(n["tag"]) == "tbl"]
    if not tables:
        return ""
    for tr in walk_nodes(tables[0], "tr"):
        for tc in tr.get("children", []):
            if local_tag(tc.get("tag", "")) != "tc":
                continue
            for child in tc.get("children", []):
                if local_tag(child.get("tag", "")) != "cellAddr":
                    continue
                a = child.get("attrs", {})
                if int(a.get("rowAddr", -1)) == row and int(a.get("colAddr", -1)) == col:
                    t_nodes = [
                        n for n in walk_nodes(tc) if local_tag(n.get("tag", "")) == "t"
                    ]
                    return t_nodes[0].get("text", "") if t_nodes else ""
    return ""


def _assert_hwpx_korean(path: Path, expected: str | None = None) -> None:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("Contents/section0.xml").decode("utf-8")
    if "hp:" not in xml and "hs:" not in xml:
        raise AssertionError(f"{path.name}: hp:/hs: 접두사 없음 (ns0: 변환 의심)")
    if "ns0:" in xml or "ns1:" in xml:
        raise AssertionError(f"{path.name}: ns0:/ns1: 접두사 감지 — lxml 미적용")
    if expected and expected not in xml:
        raise AssertionError(f"{path.name}: '{expected}' UTF-8 본문 없음")
    print(f"  OK  {path.name} — hp: 접두사·UTF-8 한글 확인")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    if not TEMPLATE_HWPX.is_file():
        raise SystemExit(f"템플릿 없음: {TEMPLATE_HWPX}")

    with tempfile.TemporaryDirectory() as tmp:
        xml_dir = Path(tmp) / "xml"
        extract_hwpx(TEMPLATE_HWPX, xml_dir)
        hwpx_xml_to_json(xml_dir, OUT / "step2_plan.json")
        render_json = make_file_json_from_bytes(
            load_render_template_bytes("plan"), template_kind="plan"
        )
        (OUT / "step2_plan_render.json").write_text(
            json.dumps(render_json, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    roundtrip_path = OUT / "step2_cell3_roundtrip.hwpx"
    roundtrip_path.write_bytes(
        json_to_hwpx_bytes(load_render_template_bytes("plan"), render_json)
    )
    print("cell3 라운드트립:", roundtrip_path)
    _assert_hwpx_korean(roundtrip_path)

    form = {
        "projectName": SAMPLE_NAME,
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
    filled = apply_plan_form(render_json, form, template_kind="plan")
    cell_text = _first_t_text(filled["section"]["data"], 0, 1)
    print(f"cell (0,1) 치환값: {cell_text!r}")
    if cell_text != SAMPLE_NAME:
        raise AssertionError(f"셀 치환 실패: {cell_text!r} != {SAMPLE_NAME!r}")

    replace_path = OUT / "step2_cell4_replace.hwpx"
    replace_path.write_bytes(build_hwpx_from_file_json("plan", filled))
    print("cell4 치환:", replace_path)
    _assert_hwpx_korean(replace_path, expected=SAMPLE_NAME)
    print("검증 완료 — 한글 2024에서 파일을 열어 확인하세요.")


if __name__ == "__main__":
    main()
