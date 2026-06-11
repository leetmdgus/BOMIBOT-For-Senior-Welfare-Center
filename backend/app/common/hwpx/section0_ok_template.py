"""한글 2024 검증 템플릿 기반 section0.xml 생성.

`templates/section0_*.xml` 구조를 유지하고 본문(hp:p/hp:tbl)만 주입한다.
"""

from __future__ import annotations

from lxml import etree

from app.common.hwpx.encoding import sanitize_hwpx_text
from app.common.hwpx.hwpx_templates import (
    HwpxTemplateKind,
    infer_border_fill_ids,
    load_body_paragraph_proto,
    load_heading_paragraph_proto,
    load_section0_template_bytes,
    template_style,
)
from app.common.hwpx.models import HwpxDocument, HwpxTable, HwpxTableCell

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HS_NS = "http://www.hancom.co.kr/hwpml/2011/section"

NSMAP = {
    "hp": HP_NS,
    "hs": HS_NS,
}

HWPX_LINE_AREA = 42520

_heading_proto_cache: dict[str, bytes | None] = {}


def _heading_paragraph_proto(kind: HwpxTemplateKind) -> etree._Element | None:
    if kind not in _heading_proto_cache:
        raw = load_heading_paragraph_proto(kind)
        _heading_proto_cache[kind] = raw
    raw = _heading_proto_cache[kind]
    if not raw:
        return None
    return etree.fromstring(raw)


def _serialize_section0(root: etree._Element) -> bytes:
    """한컴 템플릿과 동일: 선언 직후 줄바꿈 없이 <hs:sec> 시작."""
    body = etree.tostring(root, encoding="UTF-8", xml_declaration=False)
    return b'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + body


def _direct_section_paragraphs(root: etree._Element) -> list[etree._Element]:
    """섹션 직계 hp:p만 (표 셀 내부 문단 제외)."""
    return [
        child
        for child in root
        if child.tag == f"{{{HP_NS}}}p"
    ]


def build_section0_xml_ok(
    doc: HwpxDocument,
    *,
    template_kind: HwpxTemplateKind = "empty",
) -> bytes:
    style = template_style(template_kind)
    tbl_border, cell_border = infer_border_fill_ids(template_kind)

    raw = load_section0_template_bytes(template_kind)
    root = etree.fromstring(raw)

    direct_paras = _direct_section_paragraphs(root)
    if not direct_paras:
        raise ValueError("template section0.xml has no top-level hp:p")
    first = direct_paras[0]
    insert_parent = first.getparent()
    if insert_parent is None:
        raise ValueError("template section0.xml: first paragraph has no parent")

    # 표 셀 내부 hp:p는 제거하면 XML이 깨짐 → 섹션 직계 문단만 삭제
    for p in direct_paras[1:]:
        insert_parent.remove(p)

    body_raw = load_body_paragraph_proto(template_kind)
    if body_raw:
        body_proto = etree.fromstring(body_raw)
    else:
        body_proto = etree.fromstring(etree.tostring(first))

    appended_any = False
    for section in doc.sections:
        if section.title and section.title.strip():
            insert_parent.append(
                _make_text_paragraph(
                    body_proto,
                    section.title.strip(),
                    variant="heading",
                    template_kind=template_kind,
                )
            )
            appended_any = True
        for table in section.tables:
            insert_parent.append(
                _make_table_paragraph(
                    body_proto,
                    table,
                    table_border_fill_id=tbl_border,
                    cell_border_fill_id=cell_border,
                    default_char_pr_id=style.default_char_pr_id,
                )
            )
            appended_any = True
        for para in section.paragraphs:
            t = sanitize_hwpx_text(para.text).strip()
            if not t:
                continue
            variant = para.variant if para.variant in ("title", "heading", "body") else "body"
            for line in t.split("\n"):
                insert_parent.append(
                    _make_text_paragraph(body_proto, line, variant=variant)
                )
                appended_any = True

    if not appended_any:
        insert_parent.append(_make_text_paragraph(body_proto, " "))

    return _serialize_section0(root)


def _make_text_paragraph(
    proto: etree._Element,
    text: str,
    *,
    variant: str = "body",
    template_kind: HwpxTemplateKind = "empty",
) -> etree._Element:
    if variant in ("title", "heading"):
        heading_proto = _heading_paragraph_proto(template_kind)
        if heading_proto is not None:
            p = etree.fromstring(etree.tostring(heading_proto))
        else:
            p = etree.fromstring(etree.tostring(proto))
            p.set("paraPrIDRef", "20")
    else:
        p = etree.fromstring(etree.tostring(proto))

    p.set("id", "0")

    t_nodes = p.findall(".//hp:t", namespaces=NSMAP)
    if not t_nodes:
        run = etree.SubElement(p, f"{{{HP_NS}}}run")
        t = etree.SubElement(run, f"{{{HP_NS}}}t")
        t.text = text
        return p

    t_nodes[0].text = text
    for extra in t_nodes[1:]:
        extra.text = ""
    return p


def _make_table_paragraph(
    proto: etree._Element,
    table: HwpxTable,
    *,
    table_border_fill_id: str,
    cell_border_fill_id: str,
    default_char_pr_id: str,
) -> etree._Element:
    p = etree.fromstring(etree.tostring(proto))
    p.set("id", "0")

    run0 = p.find(".//hp:run", namespaces=NSMAP)
    char_id = run0.get("charPrIDRef") if run0 is not None else default_char_pr_id

    for child in list(p):
        p.remove(child)

    run = etree.SubElement(p, f"{{{HP_NS}}}run")
    run.set("charPrIDRef", str(char_id or default_char_pr_id))
    run.append(
        _build_table_element(
            table,
            table_border_fill_id=table_border_fill_id,
            cell_border_fill_id=cell_border_fill_id,
            default_char_pr_id=str(char_id or default_char_pr_id),
        )
    )
    etree.SubElement(run, f"{{{HP_NS}}}t")

    if p.find(".//hp:linesegarray", namespaces=NSMAP) is None:
        linesegarray = etree.SubElement(p, f"{{{HP_NS}}}linesegarray")
        lineseg = etree.SubElement(linesegarray, f"{{{HP_NS}}}lineseg")
        lineseg.set("textpos", "0")
        lineseg.set("vertpos", "160")
        lineseg.set("vertsize", "2800")
        lineseg.set("textheight", "2800")
        lineseg.set("baseline", "2380")
        lineseg.set("spacing", "600")
        lineseg.set("horzpos", "0")
        lineseg.set("horzsize", str(HWPX_LINE_AREA))
        lineseg.set("flags", "393216")

    return p


def _build_table_element(
    table: HwpxTable,
    *,
    table_border_fill_id: str,
    cell_border_fill_id: str,
    default_char_pr_id: str,
) -> etree._Element:
    tbl = etree.Element(f"{{{HP_NS}}}tbl")
    tbl.set("id", "1")
    tbl.set("zOrder", "1")
    tbl.set("numberingType", "TABLE")
    tbl.set("textWrap", "TOP_AND_BOTTOM")
    tbl.set("textFlow", "BOTH_SIDES")
    tbl.set("lock", "0")
    tbl.set("dropcapstyle", "None")
    tbl.set("pageBreak", "CELL")
    tbl.set("repeatHeader", "0")

    rows = table.rows or [[HwpxTableCell(text=" ")]]
    row_cnt = len(rows)
    col_cnt = max((sum((c.col_span or 1) for c in row) for row in rows), default=1)
    tbl.set("rowCnt", str(row_cnt))
    tbl.set("colCnt", str(col_cnt))
    tbl.set("cellSpacing", "0")
    tbl.set("borderFillIDRef", table_border_fill_id)
    tbl.set("noAdjust", "0")

    sz = etree.SubElement(tbl, f"{{{HP_NS}}}sz")
    sz.set("width", str(HWPX_LINE_AREA))
    sz.set("widthRelTo", "ABSOLUTE")
    sz.set("height", str(2800 * row_cnt))
    sz.set("heightRelTo", "ABSOLUTE")
    sz.set("protect", "0")

    pos = etree.SubElement(tbl, f"{{{HP_NS}}}pos")
    pos.set("treatAsChar", "1")
    pos.set("affectLSpacing", "0")
    pos.set("flowWithText", "1")
    pos.set("allowOverlap", "0")
    pos.set("holdAnchorAndSO", "0")
    pos.set("vertRelTo", "PARA")
    pos.set("horzRelTo", "PARA")
    pos.set("vertAlign", "TOP")
    pos.set("horzAlign", "LEFT")
    pos.set("vertOffset", "0")
    pos.set("horzOffset", "0")

    etree.SubElement(
        tbl, f"{{{HP_NS}}}outMargin", left="283", right="283", top="283", bottom="283"
    )
    etree.SubElement(
        tbl, f"{{{HP_NS}}}inMargin", left="141", right="141", top="141", bottom="141"
    )

    col_width = HWPX_LINE_AREA // col_cnt
    row_height = 2800

    for r, row in enumerate(rows):
        tr = etree.SubElement(tbl, f"{{{HP_NS}}}tr")
        c_index = 0
        for cell in row:
            col_span = cell.col_span or 1
            row_span = cell.row_span or 1
            tc = etree.SubElement(tr, f"{{{HP_NS}}}tc")
            tc.set("name", "")
            tc.set("header", "1" if cell.header else "0")
            tc.set("hasMargin", "0")
            tc.set("protect", "0")
            tc.set("editable", "0")
            tc.set("dirty", "0")
            tc.set("borderFillIDRef", cell_border_fill_id)

            sub = etree.SubElement(
                tc,
                f"{{{HP_NS}}}subList",
                id="",
                textDirection="HORIZONTAL",
                lineWrap="BREAK",
                vertAlign="CENTER",
                linkListIDRef="0",
                linkListNextIDRef="0",
                textWidth="0",
                textHeight="0",
                hasTextRef="0",
                hasNumRef="0",
            )
            cp = etree.SubElement(sub, f"{{{HP_NS}}}p")
            run = etree.SubElement(cp, f"{{{HP_NS}}}run")
            run.set("charPrIDRef", default_char_pr_id)
            t = etree.SubElement(run, f"{{{HP_NS}}}t")
            t.text = sanitize_hwpx_text(cell.text or " ") or " "

            etree.SubElement(
                tc, f"{{{HP_NS}}}cellAddr", colAddr=str(c_index), rowAddr=str(r)
            )
            etree.SubElement(
                tc,
                f"{{{HP_NS}}}cellSpan",
                colSpan=str(col_span),
                rowSpan=str(row_span),
            )
            etree.SubElement(
                tc,
                f"{{{HP_NS}}}cellSz",
                width=str(col_width * col_span),
                height=str(row_height * row_span),
            )
            etree.SubElement(
                tc,
                f"{{{HP_NS}}}cellMargin",
                left="510",
                right="510",
                top="141",
                bottom="141",
            )

            c_index += col_span

    return tbl
