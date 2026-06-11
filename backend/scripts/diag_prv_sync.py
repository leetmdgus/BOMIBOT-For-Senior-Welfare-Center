"""PrvText 동기화 진단 — test_C는 section0만 바꿔서 실패하는지 확인."""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.common.hwpx.export_business_plan import build_business_plan_hwpx
from app.common.hwpx.builder import build_hwpx_bytes
from app.common.hwpx.hwpx_templates import load_template_hwpx_bytes
from app.common.hwpx.zip_package import pack_hwpx_zip
from app.common.hwpx.section0_byte_fill import fill_template_package_bytes

OUT = ROOT / "_hwpx_verify_out"
OLD_NAME = "일반상담 및 정보제공사업"
NEW_NAME = "검증사업"


def _patch_project_name_only(section0: bytes, prv: bytes) -> tuple[bytes, bytes]:
    old_b = OLD_NAME.encode("utf-8")
    new_b = NEW_NAME.encode("utf-8")
    if len(new_b) < len(old_b):
        new_padded = new_b + b" " * (len(old_b) - len(new_b))
    else:
        new_padded = new_b[: len(old_b)]

    idx = section0.find(old_b)
    if idx < 0:
        raise RuntimeError("section0 placeholder not found")
    s0_out = section0[:idx] + new_padded + section0[idx + len(old_b) :]

    prv_old = f"<사 업 명><{OLD_NAME}>".encode("utf-8")
    prv_new = f"<사 업 명><{NEW_NAME}>".encode("utf-8")
    if prv.count(prv_old) != 1:
        raise RuntimeError(f"prv tag count={prv.count(prv_old)}")
    prv_out = prv.replace(prv_old, prv_new, 1)
    return s0_out, prv_out


def main() -> None:
    OUT.mkdir(exist_ok=True)
    template = load_template_hwpx_bytes("plan")
    with zipfile.ZipFile(io.BytesIO(template), "r") as zf:
        section0 = zf.read("Contents/section0.xml")
        prv = zf.read("Preview/PrvText.txt")

    # test_C 재현: section0만 변경, PrvText 템플릿 유지 → 변조 오류 예상
    s0_only, _ = _patch_project_name_only(section0, prv)
    (OUT / "test_C_byte_patch.hwpx").write_bytes(
        pack_hwpx_zip(
            {"Contents/section0.xml": s0_only, "Preview/PrvText.txt": prv},
            template_kind="plan",
        )
    )

    # test_C_fixed: section0 + PrvText 동시 변경
    s0_sync, prv_sync = _patch_project_name_only(section0, prv)
    (OUT / "test_C_prv_sync.hwpx").write_bytes(
        pack_hwpx_zip(
            {
                "Contents/section0.xml": s0_sync,
                "Preview/PrvText.txt": prv_sync,
            },
            template_kind="plan",
        )
    )

    # 전체 바이트 채움 (현재 프로덕션 경로)
    form = {
        "projectName": NEW_NAME,
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
    doc = build_business_plan_hwpx(form)
    s0_full, prv_full = fill_template_package_bytes(
        doc, section0=section0, prv=prv
    )
    (OUT / "verify_plan_v6.hwpx").write_bytes(build_hwpx_bytes(doc))
    (OUT / "test_byte_fill_full.hwpx").write_bytes(
        pack_hwpx_zip(
            {"Contents/section0.xml": s0_full, "Preview/PrvText.txt": prv_full},
            template_kind="plan",
        )
    )

    print("Wrote test_C_byte_patch, test_C_prv_sync, verify_plan_v6, test_byte_fill_full")


if __name__ == "__main__":
    main()
