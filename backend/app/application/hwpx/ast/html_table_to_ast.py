"""HTML table → 표 AST."""

from __future__ import annotations

import re
import uuid
from typing import Any

from app.application.hwpx.ast.normalize_table_grid import normalize_table_grid
from app.application.hwpx.ast.types import HWP_TABLE_WIDTH_HWPUNIT
from app.application.hwpx.encoding import sanitize_hwpx_text


def _ast_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def _cell_text(el) -> str:
    raw = " ".join((el.text_content() or "").split())
    return sanitize_hwpx_text(raw) or " "


def _parse_css_length(raw: str | None) -> int | None:
    if not raw:
        return None
    px = re.match(r"^([\d.]+)px$", raw.strip(), re.I)
    if px:
        return int(float(px.group(1)))
    pct = re.match(r"^([\d.]+)%$", raw.strip(), re.I)
    if pct:
        return int(HWP_TABLE_WIDTH_HWPUNIT * float(pct.group(1)) / 100)
    return None


def _extract_column_widths(table_el, col_count: int) -> list[int]:
    widths: list[int] = []
    for col in table_el.xpath("./colgroup/col"):
        w = _parse_css_length(col.get("data-col-width"))
        if w is None:
            style = col.get("style") or ""
            m = re.search(r"width:\s*([^;]+)", style, re.I)
            w = _parse_css_length(m.group(1).strip()) if m else None
        widths.append(w or 0)

    if len(widths) >= col_count and all(w > 0 for w in widths[:col_count]):
        return widths[:col_count]

    total = HWP_TABLE_WIDTH_HWPUNIT
    base = total // col_count
    return [base] * (col_count - 1) + [total - base * (col_count - 1)]


def _parse_font_size_px(raw: str | None) -> int | None:
    if not raw:
        return None
    m = re.match(r"^([\d.]+)\s*px$", raw.strip(), re.I)
    if not m:
        return None
    px = int(round(float(m.group(1))))
    return px if px > 0 else None


def _cell_font_size_px(cell_el) -> int | None:
    """셀 대표 글자 크기(px) — 셀 자체 또는 첫 명시 스팬 기준."""
    own = _parse_font_size_px(cell_el.get("data-bp-fz"))
    if own:
        return own
    style = cell_el.get("style") or ""
    m = re.search(r"font-size:\s*([^;]+)", style, re.I)
    own = _parse_font_size_px(m.group(1).strip()) if m else None
    if own:
        return own
    for marked in cell_el.xpath(".//*[@data-bp-fz]"):
        fz = _parse_font_size_px(marked.get("data-bp-fz"))
        if fz:
            return fz
    for styled in cell_el.xpath('.//*[contains(@style, "font-size")]'):
        sm = re.search(r"font-size:\s*([^;]+)", styled.get("style") or "", re.I)
        fz = _parse_font_size_px(sm.group(1).strip()) if sm else None
        if fz:
            return fz
    return None


def _html_cell_to_ast(cell_el) -> dict[str, Any]:
    tag = (cell_el.tag or "").lower()
    style = cell_el.get("style") or ""
    bg = cell_el.get("data-bg")
    if not bg:
        m = re.search(r"background-color:\s*([^;]+)", style, re.I)
        bg = m.group(1).strip() if m else None

    valign = "top"
    vm = re.search(r"vertical-align:\s*(\w+)", style, re.I)
    if vm and vm.group(1) in ("top", "middle", "bottom"):
        valign = vm.group(1)

    text = _cell_text(cell_el)
    return {
        "type": "tableCell",
        "id": cell_el.get("data-ast-id") or _ast_id("tc"),
        "rowSpan": int(cell_el.get("rowspan") or 1),
        "colSpan": int(cell_el.get("colspan") or 1),
        "grid": {"row": 0, "col": 0},
        "style": {
            "backgroundColor": bg,
            "verticalAlign": valign,
            "header": tag == "th",
            "fontSizePx": _cell_font_size_px(cell_el),
        },
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": text}],
            }
        ]
        if text.strip()
        else [],
        "hwp": {},
    }


def html_table_element_to_ast(table_el) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for tr in table_el.xpath("./tbody/tr | ./tr"):
        cells = [_html_cell_to_ast(c) for c in tr.xpath("./td|./th")]
        if cells:
            rows.append(
                {
                    "type": "tableRow",
                    "id": tr.get("data-ast-id") or _ast_id("tr"),
                    "cells": cells,
                }
            )

    col_spans = [
        sum(int(c.get("colSpan") or 1) for c in row.get("cells") or [])
        for row in rows
    ]
    col_count = max(1, max(col_spans)) if col_spans else 1

    if not rows:
        rows = [
            {
                "type": "tableRow",
                "id": _ast_id("tr"),
                "cells": [
                    {
                        "type": "tableCell",
                        "id": _ast_id("tc"),
                        "rowSpan": 1,
                        "colSpan": 1,
                        "grid": {"row": 0, "col": 0},
                        "style": {"verticalAlign": "top"},
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": " "}],
                            }
                        ],
                    }
                ],
            }
        ]

    return normalize_table_grid(
        {
            "type": "table",
            "id": table_el.get("data-ast-id") or _ast_id("tbl"),
            "columns": [{"width": w} for w in _extract_column_widths(table_el, col_count)],
            "rows": rows,
            "hwp": {},
        }
    )


def paragraph_text_from_blocks(blocks: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for block in blocks:
        if block.get("type") != "paragraph":
            continue
        for item in block.get("content") or []:
            if item.get("type") == "text":
                text = sanitize_hwpx_text(str(item.get("text") or "")).strip()
                if text:
                    parts.append(text)
    return " ".join(parts)
