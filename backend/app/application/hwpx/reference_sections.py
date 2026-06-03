"""sections(대목차·목차·본문) — 표 셀·PrvText 공통 매핑.

## 추가본문 템플릿 (ex_대목차+본문.hwpx)

- **9×2 표** — col0 라벨 / col1 값
- **행 0~2**: 첫 블록 프로토타입 (대목차·목차·본문) — `REFERENCE_LABEL_TEMPLATE_ROW`
- **행 3~8**: 본문 연장 슬롯 (col0 라벨은 「본문」)
- plan/evaluation 에는 `reference_table_template.py` / `embed_reference_table_in_templates.py` 로 위 표를 내장

## sections → 행 매핑 (에디터 순서)

| section.type | 추가 행 |
|--------------|---------|
| heading | 대목차 1행 |
| body | 목차 + 본문 2행 |

행이 9개를 넘으면 `plan_table_ops._lxml_ensure_reference_rows` 가
라벨별 템플릿 행(0/1/2)을 deepcopy 하여 표 rowCnt 를 늘립니다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.application.hwpx.encoding import sanitize_hwpx_text, strip_html
from app.application.hwpx.html_blocks import html_to_hwpx_blocks
from app.application.hwpx.html_images import (
    HtmlImageSegment,
    html_to_ordered_segments,
)
from app.application.hwpx.models import HwpxTable

REFERENCE_TEMPLATE_ROW_COUNT = 9
REFERENCE_BLOCK_ROW_COUNT = 3
REFERENCE_LABEL_TEMPLATE_ROW = {"대목차": 0, "목차": 1, "본문": 2}


@dataclass(frozen=True)
class ReferenceSectionRow:
    label: str
    value: str
    image: HtmlImageSegment | None = None


@dataclass(frozen=True)
class ReferenceSectionBlock:
    heading: str
    toc: str
    body: str


def _table_to_cell_text(table: HwpxTable) -> str:
    """HwpxTable → 셀에 들어갈 텍스트(행/열 구조 유지)."""
    rows: list[str] = []
    for row in table.rows:
        cells = [
            sanitize_hwpx_text(str(cell.text or "")).strip().replace("\n", " ")
            for cell in row
        ]
        # 빈 셀도 자리 유지
        row_text = " | ".join(c if c else " " for c in cells).rstrip()
        if row_text.strip():
            rows.append(row_text)
    return "\n".join(rows).strip()


def html_to_section_cell_text(html: str) -> str:
    """리치텍스트 HTML → 표 셀용 줄바꿈 텍스트."""
    if not (html or "").strip():
        return ""
    paragraphs, tables = html_to_hwpx_blocks(html)
    parts: list[str] = []
    for para in paragraphs:
        text = sanitize_hwpx_text(para.text).strip()
        if text:
            parts.append(text)
    for table in tables:
        table_text = _table_to_cell_text(table)
        if table_text:
            # 본문 텍스트와 표는 줄 단위로 구분
            if parts and parts[-1].strip():
                parts.append("")
            parts.append(table_text)
    if parts:
        # 빈 줄은 1개만 유지
        joined = "\n".join(parts)
        joined = "\n".join(line.rstrip() for line in joined.split("\n"))
        joined = "\n\n".join(block for block in joined.split("\n\n") if block.strip())
        return joined
    return strip_html(html)


def reference_rows_from_sections(
    sections: list[dict[str, Any]] | None,
) -> list[ReferenceSectionRow]:
    """문서 순서 — heading→대목차 1행, body→목차+본문(텍스트·이미지 순)."""
    sections = sections or []
    rows: list[ReferenceSectionRow] = []

    for section in sections:
        section_type = section.get("type")
        if section_type == "heading":
            title = sanitize_hwpx_text(str(section.get("title") or "").strip()) or "-"
            rows.append(ReferenceSectionRow("대목차", title))
            continue
        if section_type != "body":
            continue

        toc = sanitize_hwpx_text(str(section.get("title") or "").strip()) or "-"
        rows.append(ReferenceSectionRow("목차", toc))

        content_html = str(section.get("content") or "")
        segments = html_to_ordered_segments(content_html)
        if not segments:
            body = sanitize_hwpx_text(html_to_section_cell_text(content_html)) or "-"
            rows.append(ReferenceSectionRow("본문", body))
            continue

        text_buffer: list[str] = []
        for segment in segments:
            if segment.kind == "text":
                text_buffer.append(segment.text)
                continue
            if text_buffer:
                rows.append(
                    ReferenceSectionRow(
                        "본문",
                        sanitize_hwpx_text("\n".join(text_buffer)) or "-",
                    )
                )
                text_buffer = []
            if isinstance(segment, HtmlImageSegment):
                rows.append(
                    ReferenceSectionRow(
                        "본문",
                        sanitize_hwpx_text(segment.alt) or " ",
                        image=segment,
                    )
                )
            else:
                rows.append(ReferenceSectionRow("본문", "[이미지]"))

        if text_buffer:
            rows.append(
                ReferenceSectionRow(
                    "본문",
                    sanitize_hwpx_text("\n".join(text_buffer)) or "-",
                )
            )

    return rows


def reference_blocks_from_sections(
    sections: list[dict[str, Any]] | None,
) -> list[ReferenceSectionBlock]:
    """@deprecated — verify 스크립트 호환용 heading+body 블록 묶음."""
    sections = sections or []
    blocks: list[ReferenceSectionBlock] = []
    pending_heading: str | None = None

    for section in sections:
        section_type = section.get("type")
        if section_type == "heading":
            pending_heading = (
                sanitize_hwpx_text(str(section.get("title") or "").strip()) or "-"
            )
            continue
        if section_type != "body":
            continue

        blocks.append(
            ReferenceSectionBlock(
                heading=pending_heading or "-",
                toc=sanitize_hwpx_text(str(section.get("title") or "").strip()) or "-",
                body=sanitize_hwpx_text(
                    html_to_section_cell_text(str(section.get("content") or ""))
                )
                or "-",
            )
        )
        pending_heading = None

    if pending_heading is not None:
        blocks.append(
            ReferenceSectionBlock(heading=pending_heading, toc="-", body="-")
        )

    return blocks


def needed_reference_row_count(sections: list[dict[str, Any]] | None) -> int:
    rows = reference_rows_from_sections(sections)
    if not rows:
        return REFERENCE_TEMPLATE_ROW_COUNT
    return max(REFERENCE_TEMPLATE_ROW_COUNT, len(rows))


def reference_row_addrs_for_blocks(block_count: int) -> tuple[int, ...]:
    """@deprecated — row_addrs는 needed_reference_row_count 기준 range 사용."""
    del block_count
    return tuple(range(REFERENCE_TEMPLATE_ROW_COUNT))


def reference_values_from_sections(
    sections: list[dict[str, Any]] | None,
    *,
    row_addrs: tuple[int, ...] | None = None,
    body_rows: tuple[int, ...] | None = None,
) -> dict[tuple[int, int], str]:
    """표1(N×2) — sections 순서대로 대목차·목차·본문 행 값 매핑."""
    del body_rows
    rows = reference_rows_from_sections(sections)
    if row_addrs is None:
        row_addrs = tuple(range(needed_reference_row_count(sections)))

    values: dict[tuple[int, int], str] = {}
    for index, row in enumerate(rows):
        if index >= len(row_addrs):
            break
        addr = row_addrs[index]
        values[(addr, 0)] = row.label
        values[(addr, 1)] = row.value

    for addr in row_addrs:
        if (addr, 1) not in values:
            values[(addr, 1)] = " "

    return values


def reference_image_rows_from_sections(
    sections: list[dict[str, Any]] | None,
    *,
    row_addrs: tuple[int, ...] | None = None,
) -> dict[int, HtmlImageSegment]:
    """본문 셀(row,1) — image 세그먼트 매핑."""
    rows = reference_rows_from_sections(sections)
    if row_addrs is None:
        row_addrs = tuple(range(needed_reference_row_count(sections)))

    image_rows: dict[int, HtmlImageSegment] = {}
    for index, row in enumerate(rows):
        if index >= len(row_addrs) or row.image is None:
            continue
        image_rows[row_addrs[index]] = row.image
    return image_rows


def reference_prv_tail_tags(
    block_count: int | None = None,
    *,
    sections: list[dict[str, Any]] | None = None,
) -> tuple[str, ...]:
    del block_count
    rows = reference_rows_from_sections(sections)
    tags = [row.label for row in rows]
    target = max(REFERENCE_TEMPLATE_ROW_COUNT, len(tags))
    while len(tags) < target:
        tags.append("본문")
    return tuple(tags)


def reference_prv_tail_values(
    sections: list[dict[str, Any]] | None,
) -> list[str]:
    rows = reference_rows_from_sections(sections)
    values = [row.value for row in rows]
    tags = reference_prv_tail_tags(sections=sections)
    while len(values) < len(tags):
        values.append(" ")
    return values[: len(tags)]
