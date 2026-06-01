"""section0 표0 vs PrvText 필드 일치 검증."""

from __future__ import annotations

import io
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lxml import etree

from app.application.hwpx.section0_template_fill import _cells_by_addr
from app.application.hwpx.template_cell_maps import PLAN_MAIN_TABLE_VALUES, PLAN_SUBPROJECT_ROWS

HP = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"

PRV_TAGS = {
    "projectName": "사 업 명",
    "purpose": "목 적",
    "goals": "목 표",
    "period": "사 업 기 간",
    "target": "사 업 대 상",
    "totalCount": "연 인원 수 / 횟 수".replace(" ", ""),  # fix below
}


def _prv_tags() -> dict[str, str]:
    return {
        "projectName": "사 업 명",
        "purpose": "목 적",
        "goals": "목 표",
        "period": "사 업 기 간",
        "target": "사 업 대 상",
        "totalCount": "연 인 원 수 / 횟 수",
        "budget": "소 요 예 산",
        "budgetCategory": "예 산 과 목",
        "manager": "담 당",
    }


def _cell_plain(tbl, row: int, col: int) -> str:
    tc = _cells_by_addr(tbl).get((row, col))
    if tc is None:
        return ""
    parts = [t.text or "" for t in tc.findall(f".//{HP}t")]
    return " ".join(p.strip() for p in parts if p.strip())


def _prv_value(prv: str, tag: str) -> str:
    m = re.search(rf"<{re.escape(tag)}><([^>]*)>", prv)
    return m.group(1).strip() if m else ""


def validate(hwpx: Path) -> list[str]:
    errors: list[str] = []
    with zipfile.ZipFile(hwpx) as zf:
        s0 = zf.read("Contents/section0.xml")
        prv = zf.read("Preview/PrvText.txt").decode("utf-8")
    root = etree.fromstring(s0)
    tbl = [p for p in root if p.tag == f"{HP}p"][0].find(f".//{HP}tbl")
    if tbl is None:
        return ["no table0"]

    for field, tag in _prv_tags().items():
        addr = next((a for a, k in PLAN_MAIN_TABLE_VALUES.items() if k == field), None)
        if not addr:
            continue
        cell = _cell_plain(tbl, addr[0], addr[1])
        pv = _prv_value(prv, tag)
        if cell and pv and cell not in pv and pv not in cell:
            errors.append(f"{field}: cell={cell[:40]!r} prv={pv[:40]!r}")

    # subproject first row
    row = PLAN_SUBPROJECT_ROWS[0]
    name = _cell_plain(tbl, row, 0)
    m = re.search(rf"<{re.escape(name)}><([^>]*)>", prv)
    if name and not m:
        errors.append(f"subproject0 name tag missing: {name!r}")

    return errors


def main() -> None:
    out = ROOT / "_hwpx_verify_out"
    for name in ["verify_plan_v7.hwpx", "diag_repack_v2_plan.hwpx"]:
        p = out / name
        if not p.is_file():
            continue
        err = validate(p)
        print(name, "errors", len(err))
        for e in err[:15]:
            print(" ", e)


if __name__ == "__main__":
    main()
