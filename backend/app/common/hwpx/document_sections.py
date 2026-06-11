"""문서 섹션 배열 → HWPX 섹션."""

from __future__ import annotations

import json
from typing import Any

from app.common.hwpx.encoding import strip_html
from app.common.hwpx.html_blocks import html_to_hwpx_blocks
from app.common.hwpx.models import HwpxParagraph, HwpxSection, HwpxTable, HwpxTableCell
from app.common.hwpx.purpose_goals import build_purpose_goals_hwpx_table
from app.common.hwpx.skeleton import HWPX_COL

_HWPX_SECTION_TYPES = frozenset({"heading", "body"})


def hwpx_export_document_sections(
    sections: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """추가 본문(대목차·목차·본문) — HWPX 템플릿 reference 표·인쇄 영역과 동일."""
    return [
        section
        for section in (sections or [])
        if isinstance(section, dict) and section.get("type") in _HWPX_SECTION_TYPES
    ]


def _parse_table_section_content(content: str | None) -> dict[str, Any]:
    if not (content or "").strip():
        return {"preset": "purpose-goals"}
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict) and parsed.get("preset") == "custom":
            rows = parsed.get("rows") or []
            normalized = [
                [str(cell or "") for cell in row]
                for row in rows
                if isinstance(row, list)
            ]
            col_count = max((len(row) for row in normalized), default=1)
            filled = [
                [row[i] if i < len(row) else "" for i in range(col_count)]
                for row in normalized
            ]
            return {
                "preset": "custom",
                "rows": filled if filled else [["", ""]],
                "headerRowCount": min(
                    max(0, int(parsed.get("headerRowCount") or 1)),
                    len(filled),
                ),
            }
        if isinstance(parsed, dict) and parsed.get("preset") == "purpose-goals":
            return {"preset": "purpose-goals"}
    except json.JSONDecodeError:
        pass
    return {
        "preset": "custom",
        "rows": [[content.strip()]],
        "headerRowCount": 0,
    }


def _custom_table_to_hwpx(data: dict[str, Any]) -> HwpxTable:
    header_row_count = int(data.get("headerRowCount") or 0)
    rows: list[list[HwpxTableCell]] = []
    for row_index, row in enumerate(data.get("rows") or []):
        rows.append(
            [
                HwpxTableCell(
                    text=str(text or "-"),
                    header=row_index < header_row_count,
                )
                for text in row
            ]
        )
    return HwpxTable(rows=rows, col_widths=list(HWPX_COL["sub2"]))


def _body_section_from_html(html: str, title: str | None = None) -> HwpxSection | None:
    paragraphs, tables = html_to_hwpx_blocks(html)
    section = HwpxSection(paragraphs=[], tables=tables)
    if title and title.strip():
        section.paragraphs.append(HwpxParagraph(text=title.strip(), variant="heading"))
    section.paragraphs.extend(paragraphs)
    if not section.paragraphs and not section.tables:
        plain = strip_html(html)
        if plain:
            section.paragraphs.append(HwpxParagraph(text=plain, variant="body"))
    if not section.paragraphs and not section.tables:
        return None
    return section


def _table_section_from_plan_section(
    section: dict[str, Any],
    form_data: dict[str, Any] | None,
) -> HwpxSection | None:
    data = _parse_table_section_content(section.get("content"))
    paragraphs: list[HwpxParagraph] = []
    if section.get("title"):
        paragraphs.append(
            HwpxParagraph(text=str(section["title"]), variant="heading")
        )

    if data.get("preset") == "purpose-goals":
        if not form_data:
            return None
        table = build_purpose_goals_hwpx_table(form_data)
        if not table:
            return None
        return HwpxSection(paragraphs=paragraphs, tables=[table])

    return HwpxSection(
        title=str(section.get("title") or "표"),
        paragraphs=paragraphs,
        tables=[_custom_table_to_hwpx(data)],
    )


def hwpx_sections_from_document_sections(
    sections: list[dict[str, Any]],
    *,
    form_data: dict[str, Any] | None = None,
) -> list[HwpxSection]:
    result: list[HwpxSection] = []

    for section in sections:
        section_type = section.get("type")
        if section_type == "heading":
            result.append(
                HwpxSection(
                    paragraphs=[
                        HwpxParagraph(
                            text=str(section.get("title") or "대목차"),
                            variant="heading",
                        )
                    ]
                )
            )
            continue
        if section_type == "table":
            block = _table_section_from_plan_section(section, form_data)
            if block:
                result.append(block)
            continue
        if section_type == "body":
            block = _body_section_from_html(
                str(section.get("content") or ""),
                str(section.get("title") or "") or None,
            )
            if block:
                result.append(block)

    return result
