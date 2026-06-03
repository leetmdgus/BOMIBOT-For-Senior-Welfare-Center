from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from app.application.hwpx.hwpx_templates import HwpxTemplateKind


@dataclass
class HwpxParagraph:
    text: str
    variant: Literal["title", "heading", "body"] = "body"


@dataclass
class HwpxTableCell:
    text: str
    col_span: int | None = None
    row_span: int | None = None
    header: bool = False
    # 셀 배경색 (#RRGGBB) — 지정 시 전용 borderFill 생성
    background_color: str | None = None
    # 셀 글자 크기 (px) — 지정 시 전용 charPr 생성
    font_size_px: int | None = None


@dataclass
class HwpxTable:
    rows: list[list[HwpxTableCell]]
    col_widths: list[int] | None = None


@dataclass
class HwpxSection:
    title: str | None = None
    paragraphs: list[HwpxParagraph] = field(default_factory=list)
    tables: list[HwpxTable] = field(default_factory=list)


@dataclass
class HwpxDocument:
    title: str
    sections: list[HwpxSection]
    template_kind: HwpxTemplateKind = "empty"
    template_fill: dict[str, Any] | None = None
