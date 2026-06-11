"""표 AST → hp:tbl XML (개념 Serializer — builder/템플릿 확장용)."""

from __future__ import annotations

from html import escape
from typing import Any

from app.common.hwpx.ast.normalize_table_grid import (
    calculate_cell_width,
    normalize_table_grid,
)
from app.common.hwpx.ast.html_table_to_ast import paragraph_text_from_blocks
from app.common.hwpx.encoding import hp_text_runs


def block_to_xml(block: dict[str, Any]) -> str:
    if block.get("type") == "paragraph":
        text = paragraph_text_from_blocks([block])
        runs = hp_text_runs("0", text or " ")
        return f"<hp:p><hp:run>{runs}</hp:run></hp:p>"

    if block.get("type") == "table":
        return table_to_xml(block)

    return ""


def cell_to_xml(table: dict[str, Any], cell: dict[str, Any]) -> str:
    grid = cell.get("grid") or {}
    row = int(grid.get("row") or 0)
    col = int(grid.get("col") or 0)
    row_span = int(cell.get("rowSpan") or 1)
    col_span = int(cell.get("colSpan") or 1)
    width = calculate_cell_width(table, col, col_span)

    style = cell.get("style") or {}
    bg = style.get("backgroundColor")
    bg_attr = f' backgroundColor="{escape(str(bg))}"' if bg else ""

    content_xml = "".join(block_to_xml(b) for b in cell.get("content") or [])
    if not content_xml.strip():
        content_xml = "<hp:p><hp:run><hp:t> </hp:t></hp:run></hp:p>"

    return f"""<hp:tc>
  <hp:cellAddr rowAddr="{row}" colAddr="{col}" />
  <hp:cellSpan rowSpan="{row_span}" colSpan="{col_span}" />
  <hp:cellSz width="{width}" height="0" />
  <hp:cellPr{bg_attr} />
  <hp:subList>
    {content_xml}
  </hp:subList>
</hp:tc>"""


def table_to_xml(table: dict[str, Any]) -> str:
    normalized = normalize_table_grid(table)
    rows_xml: list[str] = []

    for row in normalized.get("rows") or []:
        cells_xml = [
            cell_to_xml(normalized, cell) for cell in row.get("cells") or []
        ]
        rows_xml.append(f"<hp:tr>{''.join(cells_xml)}</hp:tr>")

    return f"<hp:tbl>{''.join(rows_xml)}</hp:tbl>"


def header_to_xml(header: dict[str, Any]) -> bytes:
    body = "".join(block_to_xml(block) for block in header.get("blocks") or [])
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<hp:header>
  {body}
</hp:header>
"""
    return xml.encode("utf-8")


def footer_to_xml(footer: dict[str, Any]) -> bytes:
    body = "".join(block_to_xml(block) for block in footer.get("blocks") or [])
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<hp:footer>
  {body}
</hp:footer>
"""
    return xml.encode("utf-8")
