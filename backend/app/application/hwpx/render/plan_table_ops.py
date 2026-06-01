"""사업계획서 템플릿 표 — 필드 치환·세부사업 행 확장 (step2)."""

from __future__ import annotations

import copy
from typing import Any

from lxml import etree

from app.application.hwpx.encoding import sanitize_hwpx_text
from app.application.hwpx.render.cell_fill import (
    _cells_by_addr as json_cells_by_addr,
    _set_t_nodes as json_set_t_nodes,
    fill_table_cells,
)
from app.application.hwpx.render.json_tree import local_tag, walk_nodes
from app.application.hwpx.section0_template_fill import (
    HP_NS,
    _cells_by_addr as lxml_cells_by_addr,
    _set_tc_text,
    plan_purpose_text,
)
from app.application.hwpx.template_cell_maps import (
    PLAN_MAIN_TABLE_VALUES,
    PLAN_SUBPROJECT_ROWS,
)

PLAN_SUBPROJECT_DATA_START = PLAN_SUBPROJECT_ROWS[0]
PLAN_SUBPROJECT_CLONE_ROW = PLAN_SUBPROJECT_ROWS[-1]

from app.application.hwpx.hwpx_image_embed import HwpxImageCatalog, inject_image_into_tc
from app.application.hwpx.reference_sections import (
    REFERENCE_LABEL_TEMPLATE_ROW,
    REFERENCE_TEMPLATE_ROW_COUNT,
    html_to_section_cell_text,
    needed_reference_row_count,
    reference_image_rows_from_sections,
    reference_rows_from_sections,
    reference_values_from_sections,
)
from app.application.hwpx.reference_sections import REFERENCE_TEMPLATE_ROW_COUNT as REFERENCE_TABLE_ROW_COUNT


def _goals_for_template(goals: list[Any]) -> str:
    lines = [f"• {str(g).strip()}" for g in goals if str(g).strip()]
    return "\n".join(lines) if lines else "-"


def resolve_plan_field(form: dict[str, Any], field_key: str) -> str:
    raw = form.get(field_key)
    if field_key == "goals" and isinstance(raw, list):
        return sanitize_hwpx_text(_goals_for_template(raw))
    if field_key == "purpose":
        return sanitize_hwpx_text(plan_purpose_text(form))
    text = sanitize_hwpx_text(str(raw or ""))
    return text or "-"


def subproject_body(proj: dict[str, Any]) -> str:
    return "\n".join(
        x
        for x in (
            str(proj.get("output") or "").strip(),
            str(proj.get("outcome") or "").strip(),
        )
        if x
    ) or "-"


def plan_table_kind(*, row_cnt: int, col_cnt: int) -> str:
    if col_cnt == 2:
        return "reference"
    return "main"


def _lxml_set_tc_label_text(tc: etree._Element, label: str) -> None:
    """참고 표 col0 라벨(대목차·목차·본문) — 행 복제 시 라벨 정렬."""
    hp = f"{{{HP_NS}}}"
    for node in tc.findall(f".//{hp}t"):
        node.text = sanitize_hwpx_text(label) or " "
        return


def _lxml_ensure_reference_rows(
    tbl: etree._Element,
    sections: list[dict[str, Any]] | None,
    *,
    image_catalog: HwpxImageCatalog | None = None,
) -> tuple[int, ...]:
    row_cnt, col_cnt = _lxml_table_shape(tbl)
    if plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt) != "reference":
        return tuple(range(REFERENCE_TABLE_ROW_COUNT))

    needed = needed_reference_row_count(sections)
    rows = list(range(min(row_cnt, needed)))
    hp = f"{{{HP_NS}}}"

    ref_rows = reference_rows_from_sections(sections)
    while len(rows) < needed:
        row_index = len(rows)
        label = (
            ref_rows[row_index].label
            if row_index < len(ref_rows)
            else "본문"
        )
        template_row = REFERENCE_LABEL_TEMPLATE_ROW.get(label, 2)
        template_tr = _lxml_find_tr_by_row(tbl, template_row)
        if template_tr is None:
            break
        new_row = len(rows)
        new_tr = copy.deepcopy(template_tr)
        _lxml_set_row_addr(new_tr, new_row)
        _lxml_clear_tr_text(new_tr)
        cells = lxml_cells_by_addr(new_tr)
        label_tc = cells.get((new_row, 0))
        if label_tc is None:
            for tc in new_tr.findall(f".//{hp}tc"):
                addr = tc.find(f"{hp}cellAddr")
                if addr is not None and int(addr.get("colAddr", -1)) == 0:
                    label_tc = tc
                    break
        if label_tc is not None:
            _lxml_set_tc_label_text(label_tc, label)
        tbl.append(new_tr)
        row_cnt += 1
        tbl.set("rowCnt", str(row_cnt))
        rows.append(new_row)

    while row_cnt > needed:
        row_cnt -= 1
        tr = _lxml_find_tr_by_row(tbl, row_cnt)
        if tr is not None:
            tbl.remove(tr)
        tbl.set("rowCnt", str(row_cnt))
        if rows and rows[-1] == row_cnt:
            rows.pop()

    return tuple(range(row_cnt))


def _json_ensure_reference_rows(
    tbl: dict[str, Any],
    sections: list[dict[str, Any]] | None,
    *,
    image_catalog: HwpxImageCatalog | None = None,
) -> tuple[int, ...]:
    row_cnt, col_cnt = _json_table_shape(tbl)
    if plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt) != "reference":
        return tuple(range(REFERENCE_TABLE_ROW_COUNT))

    needed = needed_reference_row_count(sections)
    rows = list(range(min(row_cnt, needed)))

    ref_rows = reference_rows_from_sections(sections)
    while len(rows) < needed:
        row_index = len(rows)
        label = (
            ref_rows[row_index].label
            if row_index < len(ref_rows)
            else "본문"
        )
        template_row = REFERENCE_LABEL_TEMPLATE_ROW.get(label, 2)
        template_tr = _json_find_tr_by_row(tbl, template_row)
        if template_tr is None:
            break
        new_row = len(rows)
        new_tr = copy.deepcopy(template_tr)
        _json_set_row_addr(new_tr, new_row)
        _json_clear_tr_text(new_tr)
        _json_set_tr_label_text(new_tr, new_row, label)
        tbl.setdefault("children", []).append(new_tr)
        row_cnt += 1
        tbl.setdefault("attrs", {})["rowCnt"] = str(row_cnt)
        rows.append(new_row)

    while row_cnt > needed:
        row_cnt -= 1
        tr = _json_find_tr_by_row(tbl, row_cnt)
        if tr is not None:
            tbl.setdefault("children", []).remove(tr)
        tbl.setdefault("attrs", {})["rowCnt"] = str(row_cnt)
        if rows and rows[-1] == row_cnt:
            rows.pop()

    return tuple(range(row_cnt))


def _fill_reference_table_lxml(
    tbl: etree._Element,
    sections: list[dict[str, Any]] | None,
    *,
    image_catalog: HwpxImageCatalog | None = None,
) -> None:
    row_addrs = _lxml_ensure_reference_rows(tbl, sections, image_catalog=image_catalog)
    values = reference_values_from_sections(sections, row_addrs=row_addrs)
    image_rows = reference_image_rows_from_sections(sections, row_addrs=row_addrs)
    cells = lxml_cells_by_addr(tbl)
    for (row, col), text in values.items():
        tc = cells.get((row, col))
        if tc is not None:
            _set_tc_text(tc, text)
    if image_catalog is not None:
        for row_addr, image_segment in image_rows.items():
            tc = cells.get((row_addr, 1))
            if tc is not None:
                item_id = image_catalog.add(image_segment)
                inject_image_into_tc(tc, item_id, image_catalog)


def _fill_reference_table_json(
    tbl: dict[str, Any],
    sections: list[dict[str, Any]] | None,
) -> None:
    row_addrs = _json_ensure_reference_rows(tbl, sections)
    values = reference_values_from_sections(sections, row_addrs=row_addrs)
    cells = json_cells_by_addr(tbl)
    for (row, col), text in values.items():
        tc = cells.get((row, col))
        if tc is not None:
            json_set_t_nodes(tc, text)


def _lxml_table_shape(tbl: etree._Element) -> tuple[int, int]:
    return int(tbl.get("rowCnt") or 0), int(tbl.get("colCnt") or 0)


def _json_table_shape(tbl: dict[str, Any]) -> tuple[int, int]:
    attrs = tbl.get("attrs") or {}
    return int(attrs.get("rowCnt") or 0), int(attrs.get("colCnt") or 0)


def _lxml_find_tr_by_row(tbl: etree._Element, row_addr: int) -> etree._Element | None:
    hp = f"{{{HP_NS}}}"
    for tr in tbl.findall(f"{hp}tr"):
        for tc in tr.findall(f"{hp}tc"):
            addr = tc.find(f"{hp}cellAddr")
            if addr is not None and int(addr.get("rowAddr", -1)) == row_addr:
                return tr
    return None


def _lxml_set_row_addr(tr: etree._Element, row_addr: int) -> None:
    hp = f"{{{HP_NS}}}"
    for addr in tr.findall(f".//{hp}cellAddr"):
        addr.set("rowAddr", str(row_addr))


def _lxml_clear_tr_text(tr: etree._Element) -> None:
    hp = f"{{{HP_NS}}}"
    for node in tr.findall(f".//{hp}t"):
        node.text = " "


def _lxml_ensure_subproject_rows(tbl: etree._Element, needed: int) -> tuple[int, ...]:
    row_cnt, col_cnt = _lxml_table_shape(tbl)
    if plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt) != "main":
        return PLAN_SUBPROJECT_ROWS

    rows = list(PLAN_SUBPROJECT_ROWS)
    hp = f"{{{HP_NS}}}"

    while len(rows) < needed:
        template_row = rows[-1]
        template_tr = _lxml_find_tr_by_row(tbl, template_row)
        if template_tr is None:
            break
        new_row = rows[-1] + 1
        new_tr = copy.deepcopy(template_tr)
        _lxml_set_row_addr(new_tr, new_row)
        _lxml_clear_tr_text(new_tr)
        tbl.append(new_tr)
        row_cnt += 1
        tbl.set("rowCnt", str(row_cnt))
        rows.append(new_row)

    return tuple(rows)


def _json_find_tr_by_row(tbl: dict[str, Any], row_addr: int) -> dict[str, Any] | None:
    for tr in tbl.get("children") or []:
        if local_tag(str(tr.get("tag", ""))) != "tr":
            continue
        for tc in tr.get("children") or []:
            if local_tag(str(tc.get("tag", ""))) != "tc":
                continue
            for child in tc.get("children") or []:
                if local_tag(str(child.get("tag", ""))) != "cellAddr":
                    continue
                attrs = child.get("attrs") or {}
                if int(attrs.get("rowAddr", -1)) == row_addr:
                    return tr
    return None


def _json_set_row_addr(tr: dict[str, Any], row_addr: int) -> None:
    for node in walk_nodes(tr):
        if local_tag(str(node.get("tag", ""))) == "cellAddr":
            node.setdefault("attrs", {})["rowAddr"] = str(row_addr)


def _json_clear_tr_text(tr: dict[str, Any]) -> None:
    for node in walk_nodes(tr):
        if local_tag(str(node.get("tag", ""))) == "t":
            node["text"] = " "


def _json_set_tr_label_text(tr: dict[str, Any], row_addr: int, label: str) -> None:
    for tc in tr.get("children") or []:
        if local_tag(str(tc.get("tag", ""))) != "tc":
            continue
        for child in tc.get("children") or []:
            if local_tag(str(child.get("tag", ""))) != "cellAddr":
                continue
            attrs = child.get("attrs") or {}
            if int(attrs.get("rowAddr", -1)) == row_addr and int(
                attrs.get("colAddr", -1)
            ) == 0:
                json_set_t_nodes(tc, sanitize_hwpx_text(label) or " ")
                return


def _json_ensure_subproject_rows(tbl: dict[str, Any], needed: int) -> tuple[int, ...]:
    row_cnt, col_cnt = _json_table_shape(tbl)
    if plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt) != "main":
        return PLAN_SUBPROJECT_ROWS

    rows = list(PLAN_SUBPROJECT_ROWS)

    while len(rows) < needed:
        template_row = rows[-1]
        template_tr = _json_find_tr_by_row(tbl, template_row)
        if template_tr is None:
            break
        new_row = rows[-1] + 1
        new_tr = copy.deepcopy(template_tr)
        _json_set_row_addr(new_tr, new_row)
        _json_clear_tr_text(new_tr)
        tbl.setdefault("children", []).append(new_tr)
        row_cnt += 1
        tbl.setdefault("attrs", {})["rowCnt"] = str(row_cnt)
        rows.append(new_row)

    return tuple(rows)


def _fill_subproject_rows_lxml(
    tbl: etree._Element,
    form: dict[str, Any],
    row_addrs: tuple[int, ...],
) -> None:
    sub_projects = form.get("subProjects") or []
    cells = lxml_cells_by_addr(tbl)

    for idx, row_addr in enumerate(row_addrs):
        name_tc = cells.get((row_addr, 0))
        value_tc = cells.get((row_addr, 2))
        if idx < len(sub_projects):
            proj = sub_projects[idx] or {}
            if name_tc is not None:
                _set_tc_text(name_tc, str(proj.get("name") or "-"))
            if value_tc is not None:
                _set_tc_text(value_tc, subproject_body(proj))
        else:
            if name_tc is not None:
                _set_tc_text(name_tc, " ")
            if value_tc is not None:
                _set_tc_text(value_tc, " ")


def _fill_subproject_rows_json(
    tbl: dict[str, Any],
    form: dict[str, Any],
    row_addrs: tuple[int, ...],
) -> None:
    sub_projects = form.get("subProjects") or []
    cells = json_cells_by_addr(tbl)

    for idx, row_addr in enumerate(row_addrs):
        name_tc = cells.get((row_addr, 0))
        value_tc = cells.get((row_addr, 2))
        if idx < len(sub_projects):
            proj = sub_projects[idx] or {}
            if name_tc is not None:
                json_set_t_nodes(name_tc, str(proj.get("name") or "-"))
            if value_tc is not None:
                json_set_t_nodes(value_tc, subproject_body(proj))
        else:
            if name_tc is not None:
                json_set_t_nodes(name_tc, " ")
            if value_tc is not None:
                json_set_t_nodes(value_tc, " ")


def fill_reference_sections_table_lxml(
    tbl: etree._Element,
    sections: list[dict[str, Any]] | None,
    *,
    image_catalog: HwpxImageCatalog | None = None,
) -> None:
    _fill_reference_table_lxml(tbl, sections, image_catalog=image_catalog)


def fill_reference_sections_table_json(
    tbl: dict[str, Any],
    sections: list[dict[str, Any]] | None,
) -> None:
    _fill_reference_table_json(tbl, sections)


def fill_plan_table_lxml(
    tbl: etree._Element,
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
    image_catalog: HwpxImageCatalog | None = None,
) -> None:
    row_cnt, col_cnt = _lxml_table_shape(tbl)
    kind = plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt)

    if kind == "reference":
        _fill_reference_table_lxml(tbl, sections, image_catalog=image_catalog)
        return

    def resolve(field_key: str) -> str:
        return resolve_plan_field(form, field_key)

    row_addrs = _lxml_ensure_subproject_rows(
        tbl,
        max(len(form.get("subProjects") or []), len(PLAN_SUBPROJECT_ROWS)),
    )
    cells = lxml_cells_by_addr(tbl)
    for (row, col), field_key in PLAN_MAIN_TABLE_VALUES.items():
        tc = cells.get((row, col))
        if tc is not None:
            _set_tc_text(tc, resolve(field_key))
    _fill_subproject_rows_lxml(tbl, form, row_addrs)


def fill_plan_table_json(
    tbl: dict[str, Any],
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
) -> None:
    row_cnt, col_cnt = _json_table_shape(tbl)
    kind = plan_table_kind(row_cnt=row_cnt, col_cnt=col_cnt)

    if kind == "reference":
        _fill_reference_table_json(tbl, sections)
        return

    def resolve(field_key: str) -> str:
        return resolve_plan_field(form, field_key)

    row_addrs = _json_ensure_subproject_rows(
        tbl,
        max(len(form.get("subProjects") or []), len(PLAN_SUBPROJECT_ROWS)),
    )
    fill_table_cells(tbl, PLAN_MAIN_TABLE_VALUES, resolve)
    _fill_subproject_rows_json(tbl, form, row_addrs)


def fill_all_plan_tables_json(
    section_data: dict[str, Any],
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
) -> None:
    for tbl in walk_nodes(section_data, "tbl"):
        fill_plan_table_json(tbl, form, sections=sections)


def fill_all_plan_tables_lxml_with_form(
    root: etree._Element,
    form: dict[str, Any],
    *,
    sections: list[dict[str, Any]] | None = None,
    image_catalog: HwpxImageCatalog | None = None,
) -> None:
    hp = f"{{{HP_NS}}}"
    for tbl in root.findall(f".//{hp}tbl"):
        fill_plan_table_lxml(
            tbl,
            form,
            sections=sections,
            image_catalog=image_catalog,
        )
