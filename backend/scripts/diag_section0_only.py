"""section0만 최소 변경한 HWPX 진단 파일 생성."""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.application.hwpx.export_business_plan import build_business_plan_hwpx
from app.application.hwpx.builder import build_hwpx_bytes
from app.application.hwpx.hwpx_templates import load_section0_template_bytes
from app.application.hwpx.zip_package import pack_hwpx_zip
from lxml import etree

HP = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"
OUT = ROOT / "_hwpx_verify_out"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    raw = load_section0_template_bytes("plan")
    root = etree.fromstring(raw)

    # 첫 표 (0,1) projectName hp:t 만 변경
    for p in root:
        if p.tag != f"{HP}p":
            continue
        tbl = p.find(f".//{HP}tbl")
        if tbl is None:
            continue
        for tc in tbl.findall(f".//{HP}tc"):
            addr = tc.find(f"{HP}cellAddr")
            if addr is None:
                continue
            if int(addr.get("rowAddr", -1)) == 0 and int(addr.get("colAddr", -1)) == 1:
                t = tc.find(f".//{HP}t")
                if t is not None:
                    t.text = "검증사업"
                break
        break

    body = b'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + etree.tostring(
        root, encoding="UTF-8", xml_declaration=False
    )
    (OUT / "diag_s0_one_field.hwpx").write_bytes(
        pack_hwpx_zip({"Contents/section0.xml": body}, template_kind="plan")
    )

    form = {
        "projectName": "검증사업",
        "purpose": "목적",
        "goals": ["목표1"],
        "period": "2026-01-01 ~ 2026-12-31",
        "target": "대상",
        "totalCount": "100",
        "budget": "1000",
        "budgetCategory": "인건비",
        "manager": "홍길동",
        "subProjects": [{"name": "세부1", "output": "산출", "outcome": "성과"}],
    }
    (OUT / "verify_plan_v5.hwpx").write_bytes(
        build_hwpx_bytes(build_business_plan_hwpx(form))
    )
    print("wrote diag_s0_one_field.hwpx, verify_plan_v5.hwpx")


if __name__ == "__main__":
    main()
