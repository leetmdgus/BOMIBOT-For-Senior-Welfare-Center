"""템플릿 section0.xml — 인쇄 영역(표)만 유지하고 필드를 1:1 매핑해 채움."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from lxml import etree

from app.application.hwpx.encoding import (
    format_line_slot_text,
    line_slot_display_value,
    parse_line_slots,
    sanitize_hwpx_text,
    slot_lines,
)
from app.application.hwpx.hwpx_templates import (
    HwpxTemplateKind,
    load_section0_template_bytes,
)
from app.application.hwpx.models import HwpxDocument
from app.application.hwpx.section0_ok_template import (
    _direct_section_paragraphs,
    _serialize_section0,
    build_section0_xml_ok,
)
from app.application.hwpx.template_cell_maps import (
    EVALUATION_MAIN_TABLE_VALUES,
    PLAN_MAIN_TABLE_VALUES,
    PLAN_SUBPROJECT_ROWS,
)

HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"


def _format_eval_date(iso: str) -> str:
    if not (iso or "").strip():
        return "-"
    try:
        normalized = iso.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).strftime("%Y년 %m월 %d일")
    except ValueError:
        return iso


def _goals_text(goals: list[Any]) -> str:
    return "\n".join(f"• {g}" for g in goals if g) or "-"


def _cells_by_addr(tbl: etree._Element) -> dict[tuple[int, int], etree._Element]:
    out: dict[tuple[int, int], etree._Element] = {}
    for tc in tbl.findall(f".//{{{HP_NS}}}tc"):
        addr = tc.find(f"{{{HP_NS}}}cellAddr")
        if addr is None:
            continue
        out[(int(addr.get("rowAddr", 0)), int(addr.get("colAddr", 0)))] = tc
    return out


def _set_tc_text(tc: etree._Element, value: str) -> None:
    """셀 값 — 기존 hp:t 노드의 .text만 변경 (run/문단 구조·linesegarray 유지)."""
    text = sanitize_hwpx_text(value) or " "
    lines = [ln for ln in text.split("\n") if ln.strip()]
    if not lines:
        lines = [" "]

    t_nodes = tc.findall(f".//{{{HP_NS}}}t")
    if not t_nodes:
        for run in tc.findall(f".//{{{HP_NS}}}run"):
            t = etree.SubElement(run, f"{{{HP_NS}}}t")
            t.text = " "
            t_nodes = [t]
            break
    if not t_nodes:
        return

    if len(lines) <= len(t_nodes):
        padded = lines + [" "] * (len(t_nodes) - len(lines))
    else:
        padded = lines[: len(t_nodes) - 1] + [
            "\n".join(lines[len(t_nodes) - 1 :])
        ]

    for node, line in zip(t_nodes, padded):
        node.text = sanitize_hwpx_text(line) or " "


def _direct_table_paragraphs(root: etree._Element) -> list[etree._Element]:
    return [
        p
        for p in _direct_section_paragraphs(root)
        if p.find(f".//{{{HP_NS}}}tbl") is not None
    ]


def _resolve_field_value(
    data: dict[str, Any],
    field_key: str,
    *,
    formatters: dict[str, Callable[[dict[str, Any]], str]] | None = None,
) -> str:
    if formatters and field_key in formatters:
        return formatters[field_key](data)
    raw = data.get(field_key)
    if field_key == "goals" and isinstance(raw, list):
        return _goals_text(raw)
    if field_key in ("purpose", "performanceIndicator", "evaluationTool", "keyFactorAnalysis", "goalAppropriacy", "suggestion", "supervision"):
        return slot_lines(str(raw or "")) or "-"
    if field_key == "evaluationDate":
        return _format_eval_date(str(raw or ""))
    return str(raw or "")


def _fill_table_from_field_map(
    tbl: etree._Element,
    data: dict[str, Any],
    field_map: dict[tuple[int, int], str],
    *,
    formatters: dict[str, Callable[[dict[str, Any]], str]] | None = None,
) -> None:
    cells = _cells_by_addr(tbl)
    for (row, col), field_key in field_map.items():
        tc = cells.get((row, col))
        if tc is None or not tc.findall(f".//{{{HP_NS}}}t"):
            continue
        _set_tc_text(tc, _resolve_field_value(data, field_key, formatters=formatters))


def plan_purpose_text(form: dict[str, Any]) -> str:
    return format_line_slot_text(
        "\n".join(parse_line_slots(str(form.get("purpose") or "")))
        or line_slot_display_value(str(form.get("purpose") or ""))
    ) or "-"


def _fill_plan_main_table(tbl: etree._Element, form: dict[str, Any]) -> None:
    from app.application.hwpx.render.plan_table_ops import fill_plan_table_lxml

    fill_plan_table_lxml(tbl, form)


def build_section0_from_template(doc: HwpxDocument) -> bytes:
    """템플릿 section0 — lxml 재직렬화 없이 hp:t 바이트 치환."""
    from app.application.hwpx.section0_byte_fill import build_section0_bytes_byte_fill

    return build_section0_bytes_byte_fill(doc)


def build_section0_for_document(doc: HwpxDocument) -> bytes:
    if doc.template_fill and doc.template_kind in ("plan", "evaluation"):
        return build_section0_from_template(doc)
    return build_section0_xml_ok(doc, template_kind=doc.template_kind or "empty")
