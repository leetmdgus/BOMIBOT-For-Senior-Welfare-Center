"""HWPX 템플릿 레지스트리 — 한글 2024에서 검증된 ex_* 샘플 기반."""

from __future__ import annotations

import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from lxml import etree

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
NSMAP = {"hp": HP_NS}

HwpxTemplateKind = Literal["empty", "plan", "evaluation"]

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"

# ex_* 원본 → templates/ 파일명
_TEMPLATE_HWPX: dict[HwpxTemplateKind, str] = {
    "empty": "empty.hwpx",
    "plan": "business_plan.hwpx",
    "evaluation": "business_evaluation.hwpx",
}

_SECTION0_XML: dict[HwpxTemplateKind, str] = {
    "empty": "section0_empty.xml",
    "plan": "section0_business_plan.xml",
    "evaluation": "section0_business_evaluation.xml",
}

_REFERENCE_HWPX = {
    "heading_body": "styles_heading_body.hwpx",
    "text_styles": "styles_text.hwpx",
}


@dataclass(frozen=True)
class HwpxTemplateStyle:
    """section0 생성 시 header.xml borderFill 참조 (ex 템플릿 기준)."""

    table_border_fill_id: str = "3"
    cell_border_fill_id: str = "4"
    default_char_pr_id: str = "0"
    heading_para_pr_id: str = "20"
    body_para_pr_id: str = "0"


_STYLE_BY_KIND: dict[HwpxTemplateKind, HwpxTemplateStyle] = {
    "empty": HwpxTemplateStyle(),
    "plan": HwpxTemplateStyle(),
    "evaluation": HwpxTemplateStyle(),
}


def templates_dir() -> Path:
    return _TEMPLATES_DIR


def template_hwpx_path(kind: HwpxTemplateKind) -> Path:
    name = _TEMPLATE_HWPX.get(kind, _TEMPLATE_HWPX["empty"])
    return _TEMPLATES_DIR / name


def section0_xml_path(kind: HwpxTemplateKind) -> Path:
    name = _SECTION0_XML.get(kind, _SECTION0_XML["empty"])
    return _TEMPLATES_DIR / name


def template_style(kind: HwpxTemplateKind) -> HwpxTemplateStyle:
    return _STYLE_BY_KIND.get(kind, _STYLE_BY_KIND["empty"])


def load_template_hwpx_bytes(kind: HwpxTemplateKind) -> bytes:
    path = template_hwpx_path(kind)
    if not path.is_file():
        raise FileNotFoundError(f"HWPX template not found: {path}")
    return path.read_bytes()


def load_section0_template_bytes(kind: HwpxTemplateKind) -> bytes:
    path = section0_xml_path(kind)
    if path.is_file():
        return path.read_bytes()
    # fallback: extract from hwpx on the fly
    with zipfile.ZipFile(template_hwpx_path(kind)) as zf:
        return zf.read("Contents/section0.xml")


def _first_paragraph(root: etree._Element, *, para_pr_id: str | None = None) -> etree._Element | None:
    for p in root.findall(".//hp:p", namespaces=NSMAP):
        if para_pr_id is not None and p.get("paraPrIDRef") != para_pr_id:
            continue
        if p.find(".//hp:secPr", namespaces=NSMAP) is not None:
            continue
        if p.find(".//hp:tbl", namespaces=NSMAP) is not None:
            continue
        return p
    return None


def load_heading_paragraph_proto(kind: HwpxTemplateKind) -> bytes | None:
    """동일 템플릿의 paraPrIDRef=20 대목차 문단 (header 스타일 ID 일치)."""
    root = etree.fromstring(load_section0_template_bytes(kind))
    heading = _first_paragraph(root, para_pr_id="20")
    if heading is None:
        return None
    return etree.tostring(heading)


def load_body_paragraph_proto(kind: HwpxTemplateKind) -> bytes | None:
    """섹션 직계 본문 문단 프로토타입 (표·secPr 제외)."""
    root = etree.fromstring(load_section0_template_bytes(kind))
    body = _first_paragraph(root, para_pr_id=None)
    if body is None:
        return None
    return etree.tostring(body)


def load_table_paragraph_proto(kind: HwpxTemplateKind) -> bytes | None:
    """표를 포함한 hp:p 프로토타입."""
    root = etree.fromstring(load_section0_template_bytes(kind))
    for p in root.findall(".//hp:p", namespaces=NSMAP):
        if p.find(".//hp:secPr", namespaces=NSMAP) is not None:
            continue
        if p.find(".//hp:tbl", namespaces=NSMAP) is not None:
            return etree.tostring(p)
    return None


def infer_border_fill_ids(kind: HwpxTemplateKind) -> tuple[str, str]:
    """템플릿 section0.xml 첫 표에서 borderFillIDRef 추출."""
    root = etree.fromstring(load_section0_template_bytes(kind))
    tbl = root.find(".//hp:tbl", namespaces=NSMAP)
    if tbl is None:
        return ("3", "4")
    tbl_id = tbl.get("borderFillIDRef") or "3"
    tc = tbl.find(".//hp:tc", namespaces=NSMAP)
    tc_id = tc.get("borderFillIDRef") if tc is not None else "4"
    return tbl_id, tc_id or "4"


def refresh_section0_extracts() -> None:
    """개발용: templates/*.hwpx → section0_*.xml 추출."""
    _TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    for kind, xml_name in _SECTION0_XML.items():
        hwpx = template_hwpx_path(kind)
        if not hwpx.is_file():
            continue
        with zipfile.ZipFile(hwpx) as zf:
            data = zf.read("Contents/section0.xml")
        (_TEMPLATES_DIR / xml_name).write_bytes(data)
