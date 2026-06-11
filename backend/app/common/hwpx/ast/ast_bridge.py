"""표 AST → models.HwpxTable / 미리보기 HTML."""

from __future__ import annotations

import html
from typing import Any

from app.common.hwpx.ast.normalize_table_grid import (
    calculate_cell_width,
    normalize_table_grid,
)
from app.common.hwpx.ast.html_table_to_ast import paragraph_text_from_blocks
from app.common.hwpx.ast.types import HWP_TABLE_WIDTH_HWPUNIT
from app.common.hwpx.models import HwpxTable, HwpxTableCell


def ast_to_hwpx_table(table: dict[str, Any]) -> HwpxTable:
    normalized = normalize_table_grid(table)
    rows: list[list[HwpxTableCell]] = []

    for row in normalized.get("rows") or []:
        hwpx_row: list[HwpxTableCell] = []
        for cell in row.get("cells") or []:
            style = cell.get("style") or {}
            col_span = int(cell.get("colSpan") or 1)
            row_span = int(cell.get("rowSpan") or 1)
            font_size = style.get("fontSizePx")
            hwpx_row.append(
                HwpxTableCell(
                    text=paragraph_text_from_blocks(cell.get("content") or []) or " ",
                    col_span=col_span if col_span > 1 else None,
                    row_span=row_span if row_span > 1 else None,
                    header=bool(style.get("header")),
                    background_color=style.get("backgroundColor") or None,
                    font_size_px=int(font_size) if font_size else None,
                )
            )
        if hwpx_row:
            rows.append(hwpx_row)

    col_widths = [
        int(col.get("width", 120)) for col in normalized.get("columns") or []
    ]

    if not rows:
        rows = [[HwpxTableCell(text=" ")]]

    return HwpxTable(rows=rows, col_widths=col_widths or None)


def _blocks_to_html(blocks: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for block in blocks:
        if block.get("type") == "table":
            parts.append(ast_table_to_html(block))
            continue
        text = paragraph_text_from_blocks([block])
        if text:
            parts.append(f"<p>{html.escape(text)}</p>")
    return "".join(parts)


def ast_table_to_html(table: dict[str, Any]) -> str:
    normalized = normalize_table_grid(table)
    col_count = len(normalized.get("columns") or []) or 1

    colgroup = "".join(
        f'<col data-col-width="{int(col.get("width", 120))}" '
        f'style="width:{round(int(col.get("width", 120)) / HWP_TABLE_WIDTH_HWPUNIT * 100, 1)}%" />'
        for col in normalized.get("columns") or []
    )

    rows_html: list[str] = []
    for row in normalized.get("rows") or []:
        cells_html: list[str] = []
        for cell in row.get("cells") or []:
            grid = cell.get("grid") or {}
            col = int(grid.get("col") or 0)
            col_span = int(cell.get("colSpan") or 1)
            row_span = int(cell.get("rowSpan") or 1)
            width = calculate_cell_width(normalized, col, col_span)
            style = cell.get("style") or {}
            td_style = [f"vertical-align:{style.get('verticalAlign', 'top')}"]
            bg = style.get("backgroundColor")
            if bg:
                td_style.append(f"background-color:{html.escape(str(bg))}")
            td_style.append(
                f"width:{round(width / HWP_TABLE_WIDTH_HWPUNIT * 100)}%"
            )
            tag = "th" if style.get("header") else "td"
            content = _blocks_to_html(cell.get("content") or []) or "&nbsp;"
            cells_html.append(
                f'<{tag} data-ast-id="{html.escape(str(cell.get("id", "")))}" '
                f'colspan="{col_span}" rowspan="{row_span}" '
                f'style="{";".join(td_style)}">{content}</{tag}>'
            )
        rows_html.append(
            f'<tr data-ast-id="{html.escape(str(row.get("id", "")))}">'
            f'{"".join(cells_html)}</tr>'
        )

    table_id = html.escape(str(normalized.get("id", "")))
    return (
        f'<table class="hwp-ast-table hwpx-doc__table" data-ast-id="{table_id}" '
        f'style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0">'
        f"<colgroup>{colgroup or f'<col span=\"{col_count}\" />'}</colgroup>"
        f"<tbody>{''.join(rows_html)}</tbody></table>"
    )
