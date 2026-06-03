"""HWPX(ZIP+OWPML) 바이너리 생성 — lxml/UTF-8 기반."""

from __future__ import annotations

from typing import Literal

from app.application.hwpx.encoding import escape_xml, hp_text_runs, sanitize_hwpx_text
from app.application.hwpx.models import (
    HwpxDocument,
    HwpxParagraph,
    HwpxSection,
    HwpxTable,
    HwpxTableCell,
)
from app.application.hwpx.section0_template_fill import build_section0_for_document
from app.application.hwpx.zip_package import (
    has_hwpx_template,
    pack_hwpx_zip,
    pack_hwpx_zip_standalone,
)
from app.application.hwpx.skeleton import (
    HWPX_BORDER,
    HWPX_CHAR,
    HWPX_COL,
    HWPX_PARA,
    HWPX_STYLE,
    build_container_xml,
    build_header_xml,
    build_manifest_xml,
    build_meta_xml,
    build_section_open_paragraph,
    build_settings_xml,
    build_version_xml,
)

HWPX_LINE_AREA = 42520

_para_id_seq = 1
_tbl_id_seq = 1


def _reset_ids() -> None:
    global _para_id_seq, _tbl_id_seq
    _para_id_seq = 1
    _tbl_id_seq = 1


def _next_para_id() -> str:
    global _para_id_seq
    pid = str(_para_id_seq)
    _para_id_seq += 1
    return pid


def _next_tbl_id() -> str:
    global _tbl_id_seq
    tid = str(_tbl_id_seq)
    _tbl_id_seq += 1
    return tid


def _linesegarray_xml(char_height: int = 1000, vertpos: int = 0) -> str:
    baseline = int(char_height * 0.85)
    return (
        f'<hp:linesegarray><hp:lineseg textpos="0" vertpos="{vertpos}" '
        f'vertsize="{char_height}" textheight="{char_height}" baseline="{baseline}" '
        f'spacing="160" horzpos="0" horzsize="{HWPX_LINE_AREA}" flags="393216"/>'
        f"</hp:linesegarray>"
    )


def _paragraph_xml(
    text: str,
    variant: Literal["title", "heading", "body"] = "body",
) -> str:
    style_id = HWPX_STYLE[variant]
    para_id = (
        HWPX_PARA["center"]
        if variant == "title"
        else HWPX_PARA["heading"]
        if variant == "heading"
        else HWPX_PARA["body"]
    )
    char_id = HWPX_CHAR[variant]
    runs = hp_text_runs(str(char_id), text)
    char_height = 1800 if variant == "title" else 1200 if variant == "heading" else 1000
    return (
        f'<hp:p id="{_next_para_id()}" paraPrIDRef="{para_id}" '
        f'styleIDRef="{style_id}" pageBreak="0" columnBreak="0" merged="0">'
        f"{runs}{_linesegarray_xml(char_height)}</hp:p>"
    )


def _default_col_widths(col_cnt: int) -> list[int]:
    total = 42520
    base = total // col_cnt
    return [base] * (col_cnt - 1) + [total - base * (col_cnt - 1)]


def _ensure_cell(grid: list[list[HwpxTableCell | None]], row: int, col: int) -> None:
    while len(grid) <= row:
        grid.append([])
    while len(grid[row]) <= col:
        grid[row].append(None)


def _build_cell_grid(rows: list[list[HwpxTableCell]]) -> tuple[list[list[HwpxTableCell | None]], int, int]:
    grid: list[list[HwpxTableCell | None]] = []
    col_cnt = 0

    for r, row in enumerate(rows):
        c = 0
        for cell in row:
            while True:
                _ensure_cell(grid, r, c)
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
                    _ensure_cell(grid, r + dr, c + dc)
                    grid[r + dr][c + dc] = None
            c += col_span

    return grid, len(grid), col_cnt or 1


def _table_xml(table: HwpxTable) -> str:
    grid, row_cnt, col_cnt = _build_cell_grid(table.rows)
    col_widths = table.col_widths or _default_col_widths(col_cnt)
    table_width = sum(col_widths)
    row_height = 2800
    table_height = row_height * row_cnt
    tbl_id = _next_tbl_id()

    row_parts: list[str] = []
    for row_index, row in enumerate(grid):
        cells_xml: list[str] = []
        for col_index, cell in enumerate(row):
            if cell is None:
                continue
            col_span = cell.col_span or 1
            row_span = cell.row_span or 1
            cell_width = sum(col_widths[col_index : col_index + col_span])
            border_id = (
                HWPX_BORDER["headerCell"] if cell.header else HWPX_BORDER["table"]
            )
            char_id = HWPX_CHAR["label"] if cell.header else HWPX_CHAR["body"]
            para_id = HWPX_PARA["center"] if cell.header else HWPX_PARA["body"]
            style_id = HWPX_STYLE["label"] if cell.header else HWPX_STYLE["body"]
            runs = hp_text_runs(str(char_id), cell.text or " ")
            cell_char_height = 900 if cell.header else 1000
            cell_para = (
                f'<hp:p id="{_next_para_id()}" paraPrIDRef="{para_id}" '
                f'styleIDRef="{style_id}" pageBreak="0" columnBreak="0" merged="0">'
                f"{runs}{_linesegarray_xml(cell_char_height)}</hp:p>"
            )
            cells_xml.append(
                f'<hp:tc name="" header="{1 if cell.header else 0}" hasMargin="0" '
                f'protect="0" editable="0" dirty="0" borderFillIDRef="{border_id}">\n'
                f'  <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" '
                f'vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" '
                f'textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">\n'
                f"    {cell_para}\n"
                f"  </hp:subList>\n"
                f'  <hp:cellAddr colAddr="{col_index}" rowAddr="{row_index}"/>\n'
                f'  <hp:cellSpan colSpan="{col_span}" rowSpan="{row_span}"/>\n'
                f'  <hp:cellSz width="{cell_width}" height="{row_height * row_span}"/>\n'
                f'  <hp:cellMargin left="510" right="510" top="284" bottom="284"/>\n'
                f"</hp:tc>"
            )
        row_parts.append(f"<hp:tr>{''.join(cells_xml)}</hp:tr>")

    return (
        f'<hp:tbl id="{tbl_id}" zOrder="0" numberingType="TABLE" '
        f'textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" '
        f'pageBreak="CELL" repeatHeader="0" cellSpacing="0" colCnt="{col_cnt}" '
        f'rowCnt="{row_cnt}" borderFillIDRef="{HWPX_BORDER["table"]}" noAdjust="0">\n'
        f'  <hp:sz width="{table_width}" widthRelTo="ABSOLUTE" height="{table_height}" '
        f'heightRelTo="ABSOLUTE" protect="0"/>\n'
        f'  <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" '
        f'holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" '
        f'horzAlign="LEFT" vertOffset="0" horzOffset="0"/>\n'
        f'  <hp:outMargin left="283" right="283" top="283" bottom="283"/>\n'
        f'  <hp:inMargin left="141" right="141" top="141" bottom="141"/>\n'
        f'  {"".join(row_parts)}\n'
        f"</hp:tbl>"
    )


def _paragraph_with_table(table: HwpxTable) -> str:
    tbl = _table_xml(table)
    vertpos = len(table.rows) * 2800
    return (
        f'<hp:p id="{_next_para_id()}" paraPrIDRef="{HWPX_PARA["body"]}" '
        f'styleIDRef="{HWPX_STYLE["body"]}" pageBreak="0" columnBreak="0" merged="0">\n'
        f'  <hp:run charPrIDRef="{HWPX_CHAR["body"]}">{tbl}</hp:run>\n'
        f"  {_linesegarray_xml(1000, vertpos)}\n"
        f"</hp:p>"
    )


def _build_section0_xml(sections: list[HwpxSection]) -> str:
    parts: list[str] = [build_section_open_paragraph()]

    for section in sections:
        if section.title:
            parts.append(_paragraph_xml(section.title, "title"))
        for table in section.tables:
            parts.append(_paragraph_with_table(table))
        for para in section.paragraphs:
            if not para.text.strip():
                continue
            parts.append(_paragraph_xml(para.text, para.variant))

    if len(parts) == 1:
        parts.append(_paragraph_xml(" "))

    body = "\n".join(parts)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">
{body}
</hs:sec>"""


def _build_content_hpf(title: str) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:package xmlns:opf="urn:oasis:names:tc:opendocument:xmlns:package"
             xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
             xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"
             version="1.5"
             unique-identifier="bookid">
  <opf:metadata>
    <ha:title>{escape_xml(title)}</ha:title>
    <ha:subject>사업문서</ha:subject>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="header.xml" media-type="application/hwpml-head+xml"/>
    <opf:item id="section0" href="section0.xml" media-type="application/hwpml-section+xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="section0"/>
  </opf:spine>
</opf:package>"""


def _build_preview_text(doc: HwpxDocument) -> str:
    chunks: list[str] = []
    for section in doc.sections:
        if section.title:
            chunks.append(section.title)
        for para in section.paragraphs:
            chunks.append(para.text)
        for table in section.tables:
            for row in table.rows:
                for cell in row:
                    chunks.append(cell.text)
    return "\n".join(c for c in chunks if c)[:4000]


def summary_table_rows(pairs: list[tuple[str, str]]) -> list[list[HwpxTableCell]]:
    return [
        [
            HwpxTableCell(text=label, header=True),
            HwpxTableCell(text=value or "-"),
        ]
        for label, value in pairs
    ]


def form_table_row(
    a: tuple[str, str],
    b: tuple[str, str],
) -> list[HwpxTableCell]:
    return [
        HwpxTableCell(text=a[0], header=True),
        HwpxTableCell(text=a[1] or "-"),
        HwpxTableCell(text=b[0], header=True),
        HwpxTableCell(text=b[1] or "-"),
    ]


def _dynamic_hwpx_files(doc: HwpxDocument, title: str) -> dict[str, bytes]:
    """템플릿 ZIP에서 교체할 본문만 (한글 2024 검증 템플릿 유지)."""
    from app.application.hwpx.render.template_registry import (
        has_render_template,
        load_render_template_bytes,
    )
    from app.application.hwpx.section0_byte_fill import fill_template_package_bytes

    kind = doc.template_kind or "empty"
    if doc.template_fill and kind in ("plan", "evaluation"):
        import io
        import zipfile

        if has_render_template(kind):
            template = load_render_template_bytes(kind)
        else:
            from app.application.hwpx.hwpx_templates import load_template_hwpx_bytes

            template = load_template_hwpx_bytes(kind)

        with zipfile.ZipFile(io.BytesIO(template), "r") as zf:
            section0 = zf.read("Contents/section0.xml")
            prv = zf.read("Preview/PrvText.txt")
        section0, prv = fill_template_package_bytes(
            doc, section0=section0, prv=prv
        )
        return {
            "Contents/section0.xml": section0,
            "Preview/PrvText.txt": prv,
        }

    return {
        "Contents/section0.xml": build_section0_for_document(doc),
    }


def _standalone_hwpx_files(doc: HwpxDocument, title: str) -> dict[str, bytes]:
    """템플릿 없을 때 전체 패키지."""
    return {
        "mimetype": b"application/hwp+zip",
        "META-INF/container.xml": build_container_xml().encode("utf-8"),
        "META-INF/manifest.xml": build_manifest_xml().encode("utf-8"),
        "version.xml": build_version_xml().encode("utf-8"),
        "settings.xml": build_settings_xml().encode("utf-8"),
        "Contents/content.hpf": _build_content_hpf(title).encode("utf-8"),
        "Contents/header.xml": build_header_xml(title).encode("utf-8"),
        "Contents/section0.xml": _build_section0_xml(doc.sections).encode("utf-8"),
        "Meta/meta.xml": build_meta_xml(title).encode("utf-8"),
        "Preview/PrvText.txt": (
            "\ufeff" + _build_preview_text(doc)
        ).encode("utf-8"),
        "META-INF/": b"",
        "Contents/": b"",
        "Meta/": b"",
        "Preview/": b"",
    }


def build_hwpx_bytes(doc: HwpxDocument) -> bytes:
    """HWPX(ZIP+OWPML) 바이트 생성 — plan/evaluation 은 render 템플릿 치환."""
    _reset_ids()
    title = doc.title or "문서"
    kind = doc.template_kind or "empty"
    fill = doc.template_fill or {}

    if fill and kind == "plan":
        from app.application.hwpx.render.byte_pack import pack_render_hwpx_bytes

        return pack_render_hwpx_bytes(
            "plan",
            form_data=fill.get("form_data") or {},
            sections=fill.get("sections") or [],
        )

    if fill and kind == "evaluation":
        from app.application.hwpx.render.byte_pack import pack_render_hwpx_bytes

        return pack_render_hwpx_bytes(
            "evaluation",
            evaluation=fill.get("evaluation") or {},
        )

    if has_hwpx_template(kind):
        return pack_hwpx_zip(
            _dynamic_hwpx_files(doc, title),
            template_kind=kind,
        )

    return pack_hwpx_zip_standalone(_standalone_hwpx_files(doc, title))


def safe_hwpx_filename(name: str) -> str:
    safe = sanitize_hwpx_text(name)
    for char in '\\/:*?"<>|':
        safe = safe.replace(char, "_")
    safe = safe.replace(" ", "_").strip("._") or "document"
    return safe if safe.lower().endswith(".hwpx") else f"{safe}.hwpx"
