"""ex_대목차+본문.hwpx — 추가본문(9×2) 참고 표 프로토타입 (template_merge 래퍼)."""

from __future__ import annotations

import zipfile
from functools import lru_cache
from pathlib import Path

from lxml import etree

from app.common.hwpx.render.template_registry import hwpx_templates_dir
from app.common.hwpx.template_merge import (
    SectionMergeMode,
    merge_hwpx_bytes,
    merge_prv_text,
    merge_section0_xml,
)

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HP = f"{{{HP_NS}}}"

HEADING_BODY_FILENAME = "ex_대목차+본문.hwpx"


def heading_body_hwpx_path() -> Path:
    path = hwpx_templates_dir() / HEADING_BODY_FILENAME
    if not path.is_file():
        raise FileNotFoundError(f"추가본문 템플릿 없음: {path}")
    return path


def _find_reference_paragraph(root: etree._Element) -> etree._Element | None:
    for para in root.findall(f".//{HP}p"):
        for tbl in para.findall(f".//{HP}tbl"):
            if int(tbl.get("colCnt") or 0) == 2 and int(tbl.get("rowCnt") or 0) >= 3:
                return para
    return None


@lru_cache(maxsize=1)
def load_reference_paragraph_element() -> etree._Element:
    """ex_대목차+본문.hwpx 의 9×2 참고 표 문단 (deepcopy용)."""
    with zipfile.ZipFile(heading_body_hwpx_path()) as zf:
        root = etree.fromstring(zf.read("Contents/section0.xml"))
    para = _find_reference_paragraph(root)
    if para is None:
        raise ValueError(f"{HEADING_BODY_FILENAME} 에서 2열 참고 표 문단을 찾지 못했습니다.")
    return para


@lru_cache(maxsize=1)
def load_reference_prv_bytes() -> bytes:
    with zipfile.ZipFile(heading_body_hwpx_path()) as zf:
        return zf.read("Preview/PrvText.txt")


def graft_reference_table_into_section0(section0: bytes, *, replace: bool = True) -> bytes:
    """section0.xml — ex_대목차+본문.hwpx 참고 표 삽입·교체."""
    with zipfile.ZipFile(heading_body_hwpx_path()) as zf:
        addon_s0 = zf.read("Contents/section0.xml")
    mode = (
        SectionMergeMode.REPLACE_REFERENCE
        if replace
        else SectionMergeMode.INSERT_REFERENCE
    )
    return merge_section0_xml(section0, addon_s0, mode=mode)


def merge_heading_body_into_hwpx(
    base_hwpx: bytes,
    *,
    replace_reference: bool = True,
    merge_prv: bool = True,
) -> bytes:
    """base HWPX + ex_대목차+본문.hwpx 병합."""
    addon = heading_body_hwpx_path().read_bytes()
    return merge_hwpx_bytes(
        base_hwpx,
        addon,
        section_mode=(
            SectionMergeMode.REPLACE_REFERENCE
            if replace_reference
            else SectionMergeMode.INSERT_REFERENCE
        ),
        merge_prv=merge_prv,
        replace_prv_tail=replace_reference,
    )
