"""추가 본문 표 — 실제 HWPX 표(셀색·글자크기)로 section0 말미에 삽입.

참고표(라벨|값) 텍스트 채우기와 별개로, body 섹션의 HTML 표를 실제 ``<hp:tbl>`` 로
section0 끝에 추가하고, 셀 배경색·글자 크기용 borderFill/charPr 정의를 템플릿
header.xml 에 새 ID 로 주입한다.

- 템플릿 header.xml 에 실재하는 base ID(테두리·글자·문단·스타일)를 읽어 참조해 호환 유지
- 어떤 단계든 실패하면 원본 payload 를 그대로 반환(내보내기 자체는 항상 성공)
"""

from __future__ import annotations

import copy
import io
import logging
import re
import zipfile
from typing import Any

from lxml import etree
from lxml import html as lhtml

from app.common.hwpx.ast.ast_bridge import ast_to_hwpx_table
from app.common.hwpx.ast.html_table_to_ast import html_table_element_to_ast
from app.common.hwpx.encoding import escape_xml, hp_text_runs, sanitize_hwpx_text
from app.common.hwpx.models import HwpxTable, HwpxTableCell
from app.common.hwpx.render.json_tree import _HWPX_XML_DECL
from app.common.hwpx.zip_package import pack_hwpx_zip_bytes

logger = logging.getLogger(__name__)

_HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
_HWP_LINE_AREA = 42520
_ROW_HEIGHT = 2800

# 새로 부여하는 문단/표 id 시작값 — 템플릿 기존 id 와 충돌하지 않도록 큰 값 사용
_PARA_ID_BASE = 900000
_TBL_ID_BASE = 910000


# ─────────────────────────────────────────────────────────────────────
# 1. body 섹션에서 표 분리 (텍스트 채우기 중복 방지 + 실제 표 수집)
# ─────────────────────────────────────────────────────────────────────


def split_section_tables(
    sections: list[dict[str, Any]] | None,
) -> tuple[list[dict[str, Any]], list[tuple[str, HwpxTable]]]:
    """sections → (표 제거한 sections, [(라벨, HwpxTable)]).

    body content 의 ``<table>`` 을 실제 HwpxTable 로 추출하고, 텍스트 채우기용
    content 에서는 표를 제거해 중복(평문 표 + 실제 표)을 방지한다.
    """
    sections = sections or []
    stripped: list[dict[str, Any]] = []
    labeled: list[tuple[str, HwpxTable]] = []
    last_heading = ""

    for section in sections:
        if not isinstance(section, dict):
            stripped.append(section)
            continue

        section_type = section.get("type")
        if section_type == "heading":
            last_heading = str(section.get("title") or "").strip()
            stripped.append(section)
            continue

        if section_type != "body":
            stripped.append(section)
            continue

        content = str(section.get("content") or "")
        if "<table" not in content.lower():
            stripped.append(section)
            continue

        try:
            root = lhtml.fragment_fromstring(content, create_parent="div")
        except (lhtml.ParserError, ValueError):
            stripped.append(section)
            continue

        toc = str(section.get("title") or "").strip()
        label = toc or last_heading or "본문"

        for table_el in list(root.iter("table")):
            try:
                hwpx_table = ast_to_hwpx_table(html_table_element_to_ast(table_el))
                labeled.append((label, hwpx_table))
            except Exception:  # noqa: BLE001 — 표 하나 실패가 전체를 막지 않도록
                logger.warning("추가본문 표 추출 실패 — 건너뜀", exc_info=True)
            parent = table_el.getparent()
            if parent is not None:
                parent.remove(table_el)

        stripped_content = (root.text or "") + "".join(
            lhtml.tostring(child, encoding="unicode") for child in root
        )
        stripped.append({**section, "content": stripped_content})

    return stripped, labeled


# ─────────────────────────────────────────────────────────────────────
# 2. 색·크기 정규화
# ─────────────────────────────────────────────────────────────────────


def _normalize_hex(color: str | None) -> str | None:
    if not color:
        return None
    value = str(color).strip()
    if not value or value.lower() in {"transparent", "none", "auto"}:
        return None
    m = re.match(r"^#([0-9a-fA-F]{6})$", value)
    if m:
        return f"#{m.group(1).upper()}"
    m = re.match(r"^#([0-9a-fA-F]{3})$", value)
    if m:
        r, g, b = m.group(1)
        return f"#{r}{r}{g}{g}{b}{b}".upper()
    m = re.match(r"^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", value)
    if m:
        return "#" + "".join(f"{int(n):02X}" for n in m.groups())
    return None


def _font_px_to_height(px: int) -> int:
    return min(max(int(round(px)) * 100, 400), 5000)


# ─────────────────────────────────────────────────────────────────────
# 3. 템플릿 header.xml 기준 ID 파악
# ─────────────────────────────────────────────────────────────────────


class _HeaderInfo:
    def __init__(self, header_xml: str) -> None:
        self.border_item_cnt = _first_int(
            r'<hh:borderFills\s+itemCnt="(\d+)"', header_xml, 3
        )
        self.char_item_cnt = _first_int(
            r'<hh:charProperties\s+itemCnt="(\d+)"', header_xml, 4
        )
        border_ids = [int(x) for x in re.findall(r'<hh:borderFill\s+id="(\d+)"', header_xml)]
        char_ids = [int(x) for x in re.findall(r'<hh:charPr\s+id="(\d+)"', header_xml)]
        para_ids = [int(x) for x in re.findall(r'<hh:paraPr\s+id="(\d+)"', header_xml)]
        style_ids = [int(x) for x in re.findall(r'<hh:style\s+id="(\d+)"', header_xml)]

        self.max_border_id = max(border_ids) if border_ids else 2
        self.max_char_id = max(char_ids) if char_ids else 3
        self.base_para_id = min(para_ids) if para_ids else 0
        self.base_style_id = min(style_ids) if style_ids else 0
        self.base_char_id = min(char_ids) if char_ids else 0
        self.base_solid_border_id, self.base_fill_border_id = _classify_border_fills(
            header_xml
        )


def _first_int(pattern: str, text: str, default: int) -> int:
    m = re.search(pattern, text)
    return int(m.group(1)) if m else default


def _classify_border_fills(header_xml: str) -> tuple[int, int]:
    """(테두리만 있는 SOLID borderFill id, fillBrush 가진 borderFill id)."""
    solid_id: int | None = None
    fill_id: int | None = None
    for block in re.findall(r"<hh:borderFill\b.*?</hh:borderFill>", header_xml, re.S):
        m = re.search(r'id="(\d+)"', block)
        if not m:
            continue
        bid = int(m.group(1))
        has_solid = 'type="SOLID"' in block
        has_fill = "fillBrush" in block
        if has_solid and not has_fill and solid_id is None:
            solid_id = bid
        if has_fill and fill_id is None:
            fill_id = bid
    if solid_id is None:
        solid_id = 1
    if fill_id is None:
        fill_id = solid_id
    return solid_id, fill_id


# ─────────────────────────────────────────────────────────────────────
# 4. 동적 borderFill / charPr 레지스트리 + 표 XML
# ─────────────────────────────────────────────────────────────────────


class _Resources:
    def __init__(self, info: _HeaderInfo) -> None:
        self._info = info
        self._next_border = info.max_border_id + 1
        self._next_char = info.max_char_id + 1
        self.border_fills: dict[str, tuple[int, str]] = {}  # color → (id, xml)
        self.char_props: dict[int, tuple[int, str]] = {}  # height → (id, xml)

    def border_id(self, cell: HwpxTableCell) -> int:
        color = _normalize_hex(cell.background_color)
        if not color:
            return self._info.base_fill_border_id if cell.header else self._info.base_solid_border_id
        if color in self.border_fills:
            return self.border_fills[color][0]
        bid = self._next_border
        self._next_border += 1
        self.border_fills[color] = (bid, _border_fill_xml(bid, color))
        return bid

    def char_id(self, cell: HwpxTableCell) -> tuple[int, int]:
        """(charPrIDRef, charHeight)."""
        base_height = 900 if cell.header else 1000
        if not cell.font_size_px:
            return self._info.base_char_id, base_height
        height = _font_px_to_height(cell.font_size_px)
        if height == base_height:
            return self._info.base_char_id, base_height
        if height in self.char_props:
            return self.char_props[height][0], height
        cid = self._next_char
        self._next_char += 1
        self.char_props[height] = (cid, _char_pr_xml(cid, height))
        return cid, height


def _border_fill_xml(bid: int, face_color: str) -> str:
    return (
        f'<hh:borderFill id="{bid}" threeD="0" shadow="0" centerLine="NONE" '
        f'breakCellSeparateLine="0">'
        f'<hh:slash type="NONE" Crooked="0" isCounter="0"/>'
        f'<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>'
        f'<hh:left type="SOLID" width="0.12 mm" color="#000000"/>'
        f'<hh:right type="SOLID" width="0.12 mm" color="#000000"/>'
        f'<hh:top type="SOLID" width="0.12 mm" color="#000000"/>'
        f'<hh:bottom type="SOLID" width="0.12 mm" color="#000000"/>'
        f'<hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>'
        f"<hc:fillBrush>"
        f'<hc:winBrush faceColor="{escape_xml(face_color)}" hatchColor="#000000" alpha="0"/>'
        f"</hc:fillBrush>"
        f"</hh:borderFill>"
    )


def _char_pr_xml(cid: int, height: int) -> str:
    return (
        f'<hh:charPr id="{cid}" height="{height}" textColor="#111827" shadeColor="none" '
        f'useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="0">'
        f'<hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>'
        f'<hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>'
        f'<hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>'
        f'<hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>'
        f'<hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>'
        f'<hh:underline type="NONE"/>'
        f'<hh:strikeout shape="NONE" color="#000000"/>'
        f'<hh:outline type="NONE"/>'
        f'<hh:shadow type="NONE" color="#BDBDBD" offsetX="0" offsetY="0"/>'
        f"</hh:charPr>"
    )


def _linesegarray(char_height: int = 1000, vertpos: int = 0) -> str:
    baseline = int(char_height * 0.85)
    return (
        f'<hp:linesegarray><hp:lineseg textpos="0" vertpos="{vertpos}" '
        f'vertsize="{char_height}" textheight="{char_height}" baseline="{baseline}" '
        f'spacing="160" horzpos="0" horzsize="{_HWP_LINE_AREA}" flags="393216"/>'
        f"</hp:linesegarray>"
    )


def _build_cell_grid(
    rows: list[list[HwpxTableCell]],
) -> tuple[list[list[HwpxTableCell | None]], int, int]:
    grid: list[list[HwpxTableCell | None]] = []
    col_cnt = 0

    def ensure(r: int, c: int) -> None:
        while len(grid) <= r:
            grid.append([])
        while len(grid[r]) <= c:
            grid[r].append(None)

    for r, row in enumerate(rows):
        c = 0
        for cell in row:
            while True:
                ensure(r, c)
                if grid[r][c] is None:
                    break
                c += 1
            col_span = cell.col_span or 1
            row_span = cell.row_span or 1
            col_cnt = max(col_cnt, c + col_span)
            grid[r][c] = cell
            for dr in range(row_span):
                for dc in range(col_span):
                    if dr == 0 and dc == 0:
                        continue
                    ensure(r + dr, c + dc)
                    grid[r + dr][c + dc] = None
            c += col_span

    return grid, len(grid), col_cnt or 1


def _default_col_widths(col_cnt: int) -> list[int]:
    base = _HWP_LINE_AREA // col_cnt
    return [base] * (col_cnt - 1) + [_HWP_LINE_AREA - base * (col_cnt - 1)]


class _IdSeq:
    def __init__(self) -> None:
        self.para = _PARA_ID_BASE
        self.tbl = _TBL_ID_BASE

    def next_para(self) -> int:
        self.para += 1
        return self.para

    def next_tbl(self) -> int:
        self.tbl += 1
        return self.tbl


def _table_xml(
    table: HwpxTable,
    res: _Resources,
    info: _HeaderInfo,
    ids: _IdSeq,
) -> str:
    grid, row_cnt, col_cnt = _build_cell_grid(table.rows)
    col_widths = table.col_widths or _default_col_widths(col_cnt)
    if len(col_widths) < col_cnt:
        col_widths = col_widths + _default_col_widths(col_cnt - len(col_widths))
    table_width = sum(col_widths[:col_cnt])
    table_height = _ROW_HEIGHT * row_cnt

    rows_xml: list[str] = []
    for row_index, row in enumerate(grid):
        cells_xml: list[str] = []
        for col_index, cell in enumerate(row):
            if cell is None:
                continue
            col_span = cell.col_span or 1
            row_span = cell.row_span or 1
            cell_width = sum(col_widths[col_index : col_index + col_span])
            border_id = res.border_id(cell)
            char_id, char_height = res.char_id(cell)
            runs = hp_text_runs(str(char_id), cell.text or " ")
            cell_para = (
                f'<hp:p id="{ids.next_para()}" paraPrIDRef="{info.base_para_id}" '
                f'styleIDRef="{info.base_style_id}" pageBreak="0" columnBreak="0" '
                f'merged="0">{runs}{_linesegarray(char_height)}</hp:p>'
            )
            cells_xml.append(
                f'<hp:tc name="" header="{1 if cell.header else 0}" hasMargin="0" '
                f'protect="0" editable="0" dirty="0" borderFillIDRef="{border_id}">'
                f'<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" '
                f'vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" '
                f'textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">'
                f"{cell_para}"
                f"</hp:subList>"
                f'<hp:cellAddr colAddr="{col_index}" rowAddr="{row_index}"/>'
                f'<hp:cellSpan colSpan="{col_span}" rowSpan="{row_span}"/>'
                f'<hp:cellSz width="{cell_width}" height="{_ROW_HEIGHT * row_span}"/>'
                f'<hp:cellMargin left="510" right="510" top="284" bottom="284"/>'
                f"</hp:tc>"
            )
        rows_xml.append(f"<hp:tr>{''.join(cells_xml)}</hp:tr>")

    return (
        f'<hp:tbl id="{ids.next_tbl()}" zOrder="0" numberingType="TABLE" '
        f'textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" '
        f'pageBreak="CELL" repeatHeader="0" cellSpacing="0" colCnt="{col_cnt}" '
        f'rowCnt="{row_cnt}" borderFillIDRef="{info.base_solid_border_id}" noAdjust="0">'
        f'<hp:sz width="{table_width}" widthRelTo="ABSOLUTE" height="{table_height}" '
        f'heightRelTo="ABSOLUTE" protect="0"/>'
        f'<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" '
        f'holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" '
        f'horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
        f'<hp:outMargin left="283" right="283" top="283" bottom="283"/>'
        f'<hp:inMargin left="141" right="141" top="141" bottom="141"/>'
        f"{''.join(rows_xml)}"
        f"</hp:tbl>"
    )


def _label_paragraph(label: str, info: _HeaderInfo, ids: _IdSeq) -> str:
    text = sanitize_hwpx_text(label).strip()
    if not text:
        return ""
    runs = hp_text_runs(str(info.base_char_id), text)
    return (
        f'<hp:p id="{ids.next_para()}" paraPrIDRef="{info.base_para_id}" '
        f'styleIDRef="{info.base_style_id}" pageBreak="0" columnBreak="0" merged="0">'
        f"{runs}{_linesegarray(1000)}</hp:p>"
    )


def _table_paragraph(
    table: HwpxTable, res: _Resources, info: _HeaderInfo, ids: _IdSeq
) -> str:
    tbl = _table_xml(table, res, info, ids)
    vertpos = len(table.rows) * _ROW_HEIGHT
    return (
        f'<hp:p id="{ids.next_para()}" paraPrIDRef="{info.base_para_id}" '
        f'styleIDRef="{info.base_style_id}" pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="{info.base_char_id}">{tbl}</hp:run>'
        f"{_linesegarray(1000, vertpos)}</hp:p>"
    )


# ─────────────────────────────────────────────────────────────────────
# 5. payload(HWPX) 에 표 삽입 + header.xml 자원 주입
# ─────────────────────────────────────────────────────────────────────


def _inject_header_resources(
    header_xml: str, res: _Resources
) -> str:
    border_xml = "".join(xml for _, xml in res.border_fills.values())
    char_xml = "".join(xml for _, xml in res.char_props.values())

    if border_xml:
        header_xml = re.sub(
            r'(<hh:borderFills\s+itemCnt=")(\d+)(")',
            lambda m: f"{m.group(1)}{int(m.group(2)) + len(res.border_fills)}{m.group(3)}",
            header_xml,
            count=1,
        )
        header_xml = header_xml.replace(
            "</hh:borderFills>", f"{border_xml}</hh:borderFills>", 1
        )
    if char_xml:
        header_xml = re.sub(
            r'(<hh:charProperties\s+itemCnt=")(\d+)(")',
            lambda m: f"{m.group(1)}{int(m.group(2)) + len(res.char_props)}{m.group(3)}",
            header_xml,
            count=1,
        )
        header_xml = header_xml.replace(
            "</hh:charProperties>", f"{char_xml}</hh:charProperties>", 1
        )
    return header_xml


def embed_tables_into_payload(
    payload: bytes,
    labeled_tables: list[tuple[str, HwpxTable]],
) -> bytes:
    """packed HWPX 에 추가 본문 표를 실제 ``<hp:tbl>`` 로 삽입.

    실패 시 원본 payload 그대로 반환 — 내보내기 자체는 항상 성공한다.
    """
    if not labeled_tables:
        return payload

    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as zf:
            section0 = zf.read("Contents/section0.xml")
            header = zf.read("Contents/header.xml").decode("utf-8")

        info = _HeaderInfo(header)
        res = _Resources(info)
        ids = _IdSeq()

        paragraph_parts: list[str] = []
        last_label = ""
        for label, table in labeled_tables:
            if label and label != last_label:
                lp = _label_paragraph(label, info, ids)
                if lp:
                    paragraph_parts.append(lp)
                last_label = label
            paragraph_parts.append(_table_paragraph(table, res, info, ids))

        if not paragraph_parts:
            return payload

        fragment = (
            f'<wrap xmlns:hp="{_HP_NS}">{"".join(paragraph_parts)}</wrap>'
        )
        wrap = etree.fromstring(fragment.encode("utf-8"))

        root = etree.fromstring(section0)
        for child in list(wrap):
            root.append(child)
        new_section0 = _HWPX_XML_DECL + etree.tostring(
            root, encoding="utf-8", xml_declaration=False
        )

        new_header = _inject_header_resources(header, res).encode("utf-8")

        return pack_hwpx_zip_bytes(
            payload,
            {
                "Contents/section0.xml": new_section0,
                "Contents/header.xml": new_header,
            },
            allow_template_paths={"Contents/header.xml"},
        )
    except Exception:  # noqa: BLE001 — 표 삽입 실패가 내보내기를 막지 않도록
        logger.warning("추가본문 표 HWPX 삽입 실패 — 표 없이 내보냄", exc_info=True)
        return payload
