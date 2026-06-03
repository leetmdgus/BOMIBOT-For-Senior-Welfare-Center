"""HWPX 표·문서 AST — HTML ↔ 다운로드/렌더 공통 모델."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

HWP_TABLE_WIDTH_HWPUNIT = 42520

DEFAULT_HWP_PAGE: dict[str, int] = {
    "width": 794,
    "height": 1123,
    "marginTop": 72,
    "marginRight": 64,
    "marginBottom": 72,
    "marginLeft": 64,
}


class HwpGrid(TypedDict):
    row: int
    col: int


class HwpCellStyle(TypedDict, total=False):
    backgroundColor: str | None
    verticalAlign: Literal["top", "middle", "bottom"]
    header: bool


class HwpTableCell(TypedDict, total=False):
    type: Literal["tableCell"]
    id: str
    rowSpan: int
    colSpan: int
    grid: HwpGrid
    style: HwpCellStyle
    content: list[dict[str, Any]]
    hwp: dict[str, Any]


class HwpTableRow(TypedDict, total=False):
    type: Literal["tableRow"]
    id: str
    cells: list[HwpTableCell]


class HwpColumn(TypedDict):
    width: int


class HwpTable(TypedDict, total=False):
    type: Literal["table"]
    id: str
    columns: list[HwpColumn]
    rows: list[HwpTableRow]
    hwp: dict[str, Any]
