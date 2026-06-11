"""step3_rendering_hwpx.ipynb — render_json_to_html (+ step4 표)."""

from __future__ import annotations

import html
from typing import Any

from app.common.hwpx.render.html_style import (
    cell_margin_css,
    cell_td_background,
    cell_td_css_class,
    cell_td_extra_css,
    hwpunit_to_px,
    paragraph_css,
    paragraph_vertical_align,
    run_to_span,
)
from app.common.hwpx.render.template_registry import PLAN_TEMPLATE_TITLE


def _paragraph_to_html(p: dict[str, Any], *, as_document_title: bool = False) -> str:
    runs = p.get("runs", [])
    if runs:
        content = "".join(
            run_to_span(r) for r in runs if r.get("type") == "text_run"
        )
    else:
        content = html.escape(str(p.get("text", ""))) or "&nbsp;"
    if as_document_title:
        return f'<h2 class="hwpx-doc__title hwpx-doc__title--template">{content}</h2>'
    style = ";".join(paragraph_css(p))
    return f'<p style="{style}">{content}</p>'


def _table_col_count(table: dict[str, Any]) -> int:
    rows = table.get("rows") or []
    if not rows:
        return 1
    total = 0
    for cell in rows[0].get("cells", []):
        span = cell.get("cellSpan") or {}
        try:
            total += int(span.get("colSpan", 1))
        except (TypeError, ValueError):
            total += 1
    return max(1, total)


def _table_colgroup_html(
    table: dict[str, Any],
    *,
    border_fill_map: dict[str, Any],
    tbl_border_ref: Any,
) -> str:
    rows = table.get("rows") or []
    if not rows:
        return ""
    cols: list[str] = []
    for cell in rows[0].get("cells", []):
        span = cell.get("cellSpan") or {}
        try:
            colspan = int(span.get("colSpan", 1))
        except (TypeError, ValueError):
            colspan = 1
        size = cell.get("cellSz") or {}
        width_px = hwpunit_to_px(size.get("width"))
        width_attr = f' style="width:{width_px}px"' if width_px else ""
        for _ in range(colspan):
            cols.append(f"<col{width_attr}>")
    return f"<colgroup>{''.join(cols)}</colgroup>" if cols else ""


def _table_to_html(table: dict[str, Any], *, border_fill_map: dict[str, Any]) -> str:
    tbl_attrs = table.get("raw_attrs") or {}
    tbl_border_ref = tbl_attrs.get("borderFillIDRef")
    col_count = _table_col_count(table)
    table_classes = ["hwpx-doc__table", f"hwpx-doc__table--cols-{col_count}"]

    tbl_style = [
        "width:100%",
        "border-collapse:collapse",
        "table-layout:fixed",
        "margin:0",
    ]

    colgroup = _table_colgroup_html(
        table, border_fill_map=border_fill_map, tbl_border_ref=tbl_border_ref
    )

    rows_html: list[str] = []
    for row in table.get("rows", []):
        cells_html: list[str] = []
        for cell in row.get("cells", []):
            span = cell.get("cellSpan") or {}
            size = cell.get("cellSz") or {}
            raw = cell.get("raw_attrs") or {}
            addr = cell.get("cellAddr") or {}
            try:
                colspan = int(span.get("colSpan", 1))
            except (TypeError, ValueError):
                colspan = 1
            try:
                rowspan = int(span.get("rowSpan", 1))
            except (TypeError, ValueError):
                rowspan = 1
            try:
                col_addr = int(addr.get("colAddr", 0))
            except (TypeError, ValueError):
                col_addr = 0
            width_px = hwpunit_to_px(size.get("width"))
            height_px = hwpunit_to_px(size.get("height"))

            border_ref = raw.get("borderFillIDRef") or tbl_border_ref
            td_style: list[str] = []

            margin_css = cell_margin_css(cell.get("cellMargin"))
            if margin_css:
                td_style.append(margin_css)
            else:
                td_style.append("padding:4pt 6pt")

            if col_count <= 2 and width_px:
                td_style.append(f"width:{width_px}px")
            if height_px:
                td_style.append(f"min-height:{height_px}px")

            face = cell_td_background(
                border_fill_map,
                raw,
                border_ref=border_ref,
                col_addr=col_addr,
                col_count=col_count,
            )
            if face:
                td_style.append(f"background-color:{face}")

            td_class = cell_td_css_class(
                face,
                raw,
                colspan=colspan,
                col_count=col_count,
                col_addr=col_addr,
            )
            td_style.extend(cell_td_extra_css(raw, css_class=td_class))
            class_attr = f' class="{td_class}"' if td_class else ""

            para_html: list[str] = []
            cell_vert = "top"
            for p in cell.get("paragraphs", []):
                cell_vert = paragraph_vertical_align(p)
                para_html.append(_paragraph_to_html(p))

            if td_class in {"hwpx-doc__label", "hwpx-doc__sublabel", "hwpx-doc__band"}:
                cell_vert = "middle"
            td_style.append(f"vertical-align:{cell_vert}")
            cell_content = "".join(para_html) if para_html else "&nbsp;"

            cell_tag = "th" if td_class else "td"
            cells_html.append(
                f"<{cell_tag}{class_attr} colspan=\"{colspan}\" rowspan=\"{rowspan}\" "
                f'style="{";".join(td_style)}">{cell_content}</{cell_tag}>'
            )
        rows_html.append(f"<tr>{''.join(cells_html)}</tr>")

    return (
        f'<table class="{" ".join(table_classes)}" style="{";".join(tbl_style)}">'
        f"{colgroup}{''.join(rows_html)}</table>"
    )


def render_json_to_body_fragment(render_json: dict[str, Any]) -> str:
    inner = _render_body_parts(render_json)
    return f'<div class="hwpx-doc hwpx-doc--preview">{inner}</div>'


def render_json_to_html(render_json: dict[str, Any]) -> str:
    body = _render_body_parts(render_json)
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>HWPX Render</title>
</head>
<body>
{body}
</body>
</html>"""


def _normalize_document_title(text: str) -> str:
    return " ".join(str(text or "").split())


def _is_document_title_text(text: str) -> bool:
    normalized = _normalize_document_title(text)
    return normalized == PLAN_TEMPLATE_TITLE or normalized.endswith("단위사업계획서")


def _render_body_parts(render_json: dict[str, Any]) -> str:
    border_fill_map = (render_json.get("maps") or {}).get("border_fills") or {}
    body_parts: list[str] = []

    for paragraph in render_json.get("document", {}).get("paragraphs", []):
        runs = paragraph.get("runs", [])
        if not runs:
            body_parts.append("<p>&nbsp;</p>")
            continue

        first_table_idx = next(
            (index for index, run in enumerate(runs) if run.get("type") == "table"),
            len(runs),
        )
        leading_runs = runs[:first_table_idx]
        trailing_runs = runs[first_table_idx:]

        leading_text = "".join(
            run.get("text", "")
            for run in leading_runs
            if run.get("type") == "text_run"
        ).strip()

        if leading_text and _is_document_title_text(leading_text):
            body_parts.append(
                _paragraph_to_html(
                    {**paragraph, "runs": leading_runs},
                    as_document_title=True,
                )
            )
        else:
            inline_parts: list[str] = []

            def flush_inline() -> None:
                if not inline_parts:
                    return
                style = ";".join(paragraph_css(paragraph))
                body_parts.append(
                    f'<p style="{style}">{"".join(inline_parts)}</p>'
                )
                inline_parts.clear()

            for run in leading_runs:
                if run.get("type") == "text_run":
                    inline_parts.append(run_to_span(run))
            flush_inline()

        inline_parts: list[str] = []

        def flush_inline_trailing() -> None:
            if not inline_parts:
                return
            style = ";".join(paragraph_css(paragraph))
            body_parts.append(f'<p style="{style}">{"".join(inline_parts)}</p>')
            inline_parts.clear()

        for run in trailing_runs:
            if run.get("type") == "table":
                flush_inline_trailing()
                body_parts.append(
                    f'<div class="hwpx-doc__table-wrap">'
                    f'{_table_to_html(run, border_fill_map=border_fill_map)}'
                    f"</div>"
                )
            elif run.get("type") == "text_run":
                inline_parts.append(run_to_span(run))

        flush_inline_trailing()

    return "\n".join(body_parts)
