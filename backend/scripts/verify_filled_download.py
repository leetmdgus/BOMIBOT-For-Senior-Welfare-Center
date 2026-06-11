"""Filled plan/evaluation HWPX smoke test."""
from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from lxml import etree

from app.common.hwpx.render.apply_form import apply_evaluation_form, apply_plan_form
from app.common.hwpx.render.byte_pack import pack_render_hwpx_bytes
from app.common.hwpx.render.file_json_render import make_file_json_from_bytes
from app.common.hwpx.render.template_registry import load_render_template_bytes

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HP = f"{{{HP_NS}}}"
OUT = ROOT / "_hwpx_verify_out"


def cell_text(tbl: etree._Element, row: int, col: int) -> str:
    for tc in tbl.findall(f".//{HP}tc"):
        addr = tc.find(f"{HP}cellAddr")
        if addr is None:
            continue
        if int(addr.get("rowAddr")) == row and int(addr.get("colAddr")) == col:
            return "".join(t.text or "" for t in tc.findall(f".//{HP}t")).strip()
    return ""


def main() -> None:
    OUT.mkdir(exist_ok=True)
    sections = [
        {"id": "h1", "type": "heading", "title": "인냥"},
        {"id": "b1", "type": "body", "title": "정말", "content": "<p>앞녀너엊</p>"},
        {"id": "h2", "type": "heading", "title": "II. 두 번째"},
        {"id": "b2", "type": "body", "title": "목차2", "content": "<p>본문2</p>"},
    ]
    form = {
        "projectName": "교육",
        "purpose": "목적 테스트",
        "goals": ["목표1", "목표2"],
        "period": "2026-01-01 ~ 2026-12-31",
        "target": "어르신",
        "totalCount": "100명 / 100회",
        "budget": "금 15,000,000원",
        "budgetCategory": "인건비",
        "manager": "김연수",
        "subProjects": [],
    }
    plan_bytes = pack_render_hwpx_bytes("plan", form_data=form, sections=sections)
    (OUT / "verify_plan_filled.hwpx").write_bytes(plan_bytes)

    with zipfile.ZipFile(io.BytesIO(plan_bytes)) as zf:
        root = etree.fromstring(zf.read("Contents/section0.xml"))
    tables = root.findall(f".//{HP}tbl")
    ref = tables[1]
    assert "인냥" in cell_text(ref, 0, 1)
    assert "정말" in cell_text(ref, 1, 1)
    assert "앞녀너엊" in cell_text(ref, 2, 1)
    assert "II. 두 번째" in cell_text(ref, 3, 1)
    assert "목차2" in cell_text(ref, 4, 1)
    assert "본문2" in cell_text(ref, 5, 1)

    body_only = [{"id": "b0", "type": "body", "title": "정말", "content": "<p>앞녀너엊</p>"}]
    body_only_bytes = pack_render_hwpx_bytes("plan", form_data=form, sections=body_only)
    with zipfile.ZipFile(io.BytesIO(body_only_bytes)) as zf:
        ref2 = etree.fromstring(zf.read("Contents/section0.xml")).findall(f".//{HP}tbl")[1]
    assert cell_text(ref2, 0, 0) == "목차"
    assert "정말" in cell_text(ref2, 0, 1)
    assert cell_text(ref2, 1, 0) == "본문"
    assert "앞녀너엊" in cell_text(ref2, 1, 1)
    print("plan body-only sections OK")
    with zipfile.ZipFile(io.BytesIO(plan_bytes)) as zf:
        prv = zf.read("Preview/PrvText.txt").decode("utf-8")
    assert "인냥" in prv and "정말" in prv and "앞녀너엊" in prv
    print("plan reference table + prv OK")

    tiny_png = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    image_sections = [
        {
            "type": "body",
            "title": "사진",
            "content": (
                '<p>설명 텍스트</p>'
                f'<p><img src="data:image/png;base64,{tiny_png}" alt="테스트 이미지" /></p>'
            ),
        }
    ]
    image_bytes = pack_render_hwpx_bytes("plan", form_data=form, sections=image_sections)
    with zipfile.ZipFile(io.BytesIO(image_bytes)) as zf:
        names = zf.namelist()
        assert any(name.startswith("BinData/image") for name in names)
        root = etree.fromstring(zf.read("Contents/section0.xml"))
        assert b"hp:pic" in zf.read("Contents/section0.xml")
        ref_img = root.findall(f".//{HP}tbl")[1]
        assert "설명 텍스트" in cell_text(ref_img, 1, 1)
    print("plan inline image embed OK")

    multi_body = [
        {"type": "heading", "title": "I. 대목차"},
        {"type": "body", "title": "목1", "content": "<p>본문1</p>"},
        {"type": "body", "title": "목2", "content": "<p>본문2</p>"},
        {"type": "body", "title": "목3", "content": "<p>본문3</p>"},
    ]
    multi_bytes = pack_render_hwpx_bytes("plan", form_data=form, sections=multi_body)
    with zipfile.ZipFile(io.BytesIO(multi_bytes)) as zf:
        ref_m = etree.fromstring(zf.read("Contents/section0.xml")).findall(f".//{HP}tbl")[1]
        prv_m = zf.read("Preview/PrvText.txt").decode("utf-8")
    assert cell_text(ref_m, 0, 1) == "I. 대목차"
    assert "본문3" in cell_text(ref_m, 6, 1)
    assert "본문3" in prv_m
    print("plan heading + body x3 OK")

    evaluation = {
        "team": "복지1팀",
        "manager": "김연수",
        "period": "2026-01-01 ~ 2026-12-31",
        "evaluationDate": "2026-01-15",
        "programName": "교육",
        "target": "어르신",
        "planCount": "2,960명 / 2,965회",
        "planBudget": "금 15,000,000원",
        "actualCount": "896명 / 896회",
        "actualExpense": "-",
        "purpose": "목적\n두번째",
        "goals": ["목표A"],
        "performanceIndicator": "성과지표",
        "evaluationTool": "설문",
        "keyFactorAnalysis": "요인 분석",
        "goalAppropriacy": "적절성",
        "suggestion": "제언",
        "supervision": "슈퍼비전 내용",
        "detailRows": [],
        "sections": [
            {
                "id": "h1",
                "type": "heading",
                "title": "I. 프로그램 운영 결과",
            },
            {
                "id": "b1",
                "type": "body",
                "title": "",
                "content": "<p>운영 결과 본문</p>",
            },
        ],
    }
    eval_bytes = pack_render_hwpx_bytes("evaluation", evaluation=evaluation)
    (OUT / "verify_eval_filled.hwpx").write_bytes(eval_bytes)

    with zipfile.ZipFile(io.BytesIO(eval_bytes)) as zf:
        root = etree.fromstring(zf.read("Contents/section0.xml"))
    tbl = root.findall(f".//{HP}tbl")[0]
    ref = root.findall(f".//{HP}tbl")[1]
    assert cell_text(tbl, 2, 1) == "교육"
    assert "2026년" in cell_text(tbl, 1, 3) and "15" in cell_text(tbl, 1, 3)
    assert cell_text(tbl, 6, 1) == "성과지표"
    assert cell_text(tbl, 10, 0) == "슈퍼비전"
    assert cell_text(tbl, 11, 0) == "슈퍼비전 내용"
    assert "프로그램 운영" in cell_text(ref, 0, 1)
    assert "운영 결과" in cell_text(ref, 2, 1)
    with zipfile.ZipFile(io.BytesIO(eval_bytes)) as zf:
        prv = zf.read("Preview/PrvText.txt").decode("utf-8")
    assert "프로그램 운영" in prv and "운영 결과" in prv
    print("evaluation tables + prv OK")

    fj = make_file_json_from_bytes(load_render_template_bytes("plan"), template_kind="plan")
    filled = apply_plan_form(fj, form, sections=sections)
    print("apply_plan_form OK")

    efj = make_file_json_from_bytes(
        load_render_template_bytes("evaluation"), template_kind="evaluation"
    )
    apply_evaluation_form(efj, evaluation)
    print("apply_evaluation_form OK")
    print("wrote", OUT / "verify_plan_filled.hwpx", OUT / "verify_eval_filled.hwpx")


if __name__ == "__main__":
    main()
