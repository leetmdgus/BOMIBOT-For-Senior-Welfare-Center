"""ex_사업계획.hwpx 템플릿 — 문서 제목·세부사업명 등 초기값 추출."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.common.hwpx.render.json_tree import first_child, local_tag, walk_nodes
from app.common.hwpx.render.plan_table_ops import plan_table_kind
from app.common.hwpx.render.template_registry import PLAN_TEMPLATE_TITLE
from app.common.hwpx.template_cell_maps import (
    PLAN_MAIN_TABLE_VALUES,
    PLAN_SUBPROJECT_ROWS,
)


def _cell_plain_text(tc_node: dict[str, Any]) -> str:
    parts: list[str] = []
    for p_node in walk_nodes(tc_node, "p"):
        for child in p_node.get("children") or []:
            if local_tag(str(child.get("tag", ""))) != "run":
                continue
            for t_node in child.get("children") or []:
                if local_tag(str(t_node.get("tag", ""))) == "t":
                    parts.append(str(t_node.get("text") or ""))
    return "".join(parts).strip()


def _json_table_shape(tbl: dict[str, Any]) -> tuple[int, int]:
    attrs = tbl.get("attrs") or {}
    return int(attrs.get("rowCnt") or 0), int(attrs.get("colCnt") or 0)


def _json_cells_by_addr(tbl: dict[str, Any]) -> dict[tuple[int, int], dict[str, Any]]:
    cells: dict[tuple[int, int], dict[str, Any]] = {}
    for tr in tbl.get("children") or []:
        if local_tag(str(tr.get("tag", ""))) != "tr":
            continue
        for tc in tr.get("children") or []:
            if local_tag(str(tc.get("tag", ""))) != "tc":
                continue
            addr_node = first_child(tc, "cellAddr")
            if addr_node is None:
                continue
            attrs = addr_node.get("attrs") or {}
            row = int(attrs.get("rowAddr", -1))
            col = int(attrs.get("colAddr", -1))
            if row >= 0 and col >= 0:
                cells[(row, col)] = tc
    return cells


def _find_main_table(section_root: dict[str, Any]) -> dict[str, Any] | None:
    for tbl in walk_nodes(section_root, "tbl"):
        row_cnt, col_cnt = _json_table_shape(tbl)
        if plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt) == "main":
            return tbl
    return None


def extract_plan_template_defaults_from_file_json(
    file_json: dict[str, Any],
) -> dict[str, Any]:
    section = file_json.get("section", {}).get("data") or {}
    main_tbl = _find_main_table(section)
    sub_projects: list[dict[str, str]] = []

    if main_tbl is not None:
        cells = _json_cells_by_addr(main_tbl)
        for row_addr in PLAN_SUBPROJECT_ROWS:
            name_tc = cells.get((row_addr, 0))
            value_tc = cells.get((row_addr, 2))
            name = _cell_plain_text(name_tc) if name_tc else ""
            output = _cell_plain_text(value_tc) if value_tc else ""
            if not name:
                continue
            sub_projects.append(
                {
                    "name": name,
                    "output": output if output not in {"", "-", "내용"} else "",
                    "outcome": "",
                }
            )

    project_name = ""
    if main_tbl is not None:
        cells = _json_cells_by_addr(main_tbl)
        name_cell = cells.get((0, 1))
        if name_cell is not None:
            raw = _cell_plain_text(name_cell)
            if raw not in {"", "-", "내용"}:
                project_name = raw

    return {
        "documentTitle": PLAN_TEMPLATE_TITLE,
        "projectName": project_name,
        "subProjects": sub_projects,
        "mainTableFields": tuple(PLAN_MAIN_TABLE_VALUES.values()),
    }


@lru_cache(maxsize=1)
def get_plan_template_defaults() -> dict[str, Any]:
    from app.common.hwpx.render.pipeline import build_file_json_from_template

    file_json = build_file_json_from_template("plan")
    return extract_plan_template_defaults_from_file_json(file_json)


def merge_plan_form_with_template_defaults(form: dict[str, Any]) -> dict[str, Any]:
    """비어 있는 세부사업·사업명 등을 템플릿 초기값으로 보충."""
    defaults = get_plan_template_defaults()
    merged = dict(form)

    if not merged.get("subProjects"):
        merged["subProjects"] = [
            dict(item) for item in defaults.get("subProjects") or []
        ]

    if not str(merged.get("projectName") or "").strip():
        template_name = str(defaults.get("projectName") or "").strip()
        if template_name:
            merged["projectName"] = template_name

    return merged
