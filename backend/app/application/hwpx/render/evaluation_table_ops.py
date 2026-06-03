"""사업평가서 템플릿 표 — 필드 치환 (ex_사업평가 2.hwpx 12×4 + 참고 9×2)."""

from __future__ import annotations

from typing import Any

from lxml import etree

from app.application.hwpx.encoding import sanitize_hwpx_text, slot_lines
from app.application.hwpx.render.cell_fill import (
    _cells_by_addr as json_cells_by_addr,
    _set_t_nodes as json_set_t_nodes,
)
from app.application.hwpx.render.json_tree import local_tag, walk_nodes
from app.application.hwpx.hwpx_image_embed import HwpxImageCatalog
from app.application.hwpx.render.plan_table_ops import (
    fill_reference_sections_table_json,
    fill_reference_sections_table_lxml,
)
from app.application.hwpx.section0_template_fill import HP_NS, _cells_by_addr, _set_tc_text
from app.application.hwpx.template_cell_maps import EVALUATION_MAIN_TABLE_VALUES

# ex_사업평가 2.hwpx — row 10 슈퍼비전 밴드, row 11 슈퍼비전 본문 (세부 항목 없음)
EVALUATION_MAIN_ROW_COUNT = 12
EVALUATION_SUPERVISION_CONTENT_ROW = 11


def evaluation_table_kind(*, row_cnt: int, col_cnt: int) -> str:
    if col_cnt == 2:
        return "reference"
    if col_cnt == 4 and row_cnt >= EVALUATION_MAIN_ROW_COUNT:
        return "main"
    return "other"


def _goals_for_template(goals: list[Any]) -> str:
    lines = [f"• {str(g).strip()}" for g in goals if str(g).strip()]
    return "\n".join(lines) if lines else "-"


def _format_eval_date(iso: str) -> str:
    from datetime import datetime

    if not (iso or "").strip():
        return "-"
    try:
        normalized = iso.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).strftime("%Y년 %m월 %d일")
    except ValueError:
        return iso


def resolve_evaluation_field(evaluation: dict[str, Any], field_key: str) -> str:
    raw = evaluation.get(field_key)
    if field_key == "goals" and isinstance(raw, list):
        return sanitize_hwpx_text(_goals_for_template(raw))
    if field_key in (
        "purpose",
        "performanceIndicator",
        "evaluationTool",
        "keyFactorAnalysis",
        "goalAppropriacy",
        "suggestion",
        "supervision",
    ):
        return sanitize_hwpx_text(slot_lines(str(raw or "")) or "-")
    if field_key == "evaluationDate":
        return sanitize_hwpx_text(_format_eval_date(str(raw or "")))
    return sanitize_hwpx_text(str(raw or "")) or "-"


def _fill_supervision_lxml(tbl: etree._Element, evaluation: dict[str, Any]) -> None:
    cells = _cells_by_addr(tbl)
    tc = cells.get((EVALUATION_SUPERVISION_CONTENT_ROW, 0))
    if tc is not None:
        _set_tc_text(tc, resolve_evaluation_field(evaluation, "supervision"))


def _fill_supervision_json(tbl: dict[str, Any], evaluation: dict[str, Any]) -> None:
    cells = json_cells_by_addr(tbl)
    tc = cells.get((EVALUATION_SUPERVISION_CONTENT_ROW, 0))
    if tc is not None:
        json_set_t_nodes(tc, resolve_evaluation_field(evaluation, "supervision"))


def fill_evaluation_table_lxml(
    tbl: etree._Element,
    evaluation: dict[str, Any],
    *,
    image_catalog: HwpxImageCatalog | None = None,
) -> None:
    row_cnt, col_cnt = int(tbl.get("rowCnt") or 0), int(tbl.get("colCnt") or 0)
    kind = evaluation_table_kind(row_cnt=row_cnt, col_cnt=col_cnt)
    if kind == "reference":
        fill_reference_sections_table_lxml(
            tbl,
            evaluation.get("sections"),
            image_catalog=image_catalog,
        )
        return
    if kind != "main":
        return
    cells = _cells_by_addr(tbl)
    for (row, col), field_key in EVALUATION_MAIN_TABLE_VALUES.items():
        tc = cells.get((row, col))
        if tc is not None:
            _set_tc_text(tc, resolve_evaluation_field(evaluation, field_key))
    _fill_supervision_lxml(tbl, evaluation)


def fill_evaluation_table_json(tbl: dict[str, Any], evaluation: dict[str, Any]) -> None:
    attrs = tbl.get("attrs") or {}
    row_cnt, col_cnt = int(attrs.get("rowCnt") or 0), int(attrs.get("colCnt") or 0)
    kind = evaluation_table_kind(row_cnt=row_cnt, col_cnt=col_cnt)
    if kind == "reference":
        fill_reference_sections_table_json(tbl, evaluation.get("sections"))
        return
    if kind != "main":
        return
    cells = json_cells_by_addr(tbl)
    for (row, col), field_key in EVALUATION_MAIN_TABLE_VALUES.items():
        tc = cells.get((row, col))
        if tc is not None:
            json_set_t_nodes(tc, resolve_evaluation_field(evaluation, field_key))
    _fill_supervision_json(tbl, evaluation)


def fill_all_evaluation_tables_json(
    section_data: dict[str, Any], evaluation: dict[str, Any]
) -> None:
    for tbl in walk_nodes(section_data, "tbl"):
        fill_evaluation_table_json(tbl, evaluation)


def fill_all_evaluation_tables_lxml(
    root: etree._Element,
    evaluation: dict[str, Any],
    *,
    image_catalog: HwpxImageCatalog | None = None,
) -> None:
    hp = f"{{{HP_NS}}}"
    for tbl in root.findall(f".//{hp}tbl"):
        fill_evaluation_table_lxml(tbl, evaluation, image_catalog=image_catalog)
