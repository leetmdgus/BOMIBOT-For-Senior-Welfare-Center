"""목적·목표 3열 HWPX 표."""

from __future__ import annotations

from typing import Any

from app.common.hwpx.encoding import (
    format_line_slot_text,
    line_slot_display_value,
    parse_line_slots,
)
from app.common.hwpx.models import HwpxTable, HwpxTableCell


def _split_sub_project_output(name: str, output: str) -> tuple[str, str, list[str]]:
    lines = [line.strip() for line in output.split("\n") if line.strip()]
    title = name.strip() or (lines[0].lstrip("- ").strip() if lines else "세부사업명")
    summary = next(
        (line for line in lines if not line.startswith("-") and line != title and not line.startswith(title)),
        None,
    )
    bullets = [line.lstrip("- ").strip() for line in lines if line.startswith("-")]
    headline = lines[0] if lines and not lines[0].startswith("-") else (summary or "")
    return title, headline, bullets


def _format_goal_output_text(name: str, output: str) -> str:
    title, headline, bullets = _split_sub_project_output(name, output)
    lines: list[str] = []
    if title:
        lines.append(title)
    if headline and headline != title:
        lines.append(headline)
    for bullet in bullets:
        lines.append(f"• {bullet}")
    return "\n".join(lines) if lines else "-"


def _compute_outcome_row_spans(sub_projects: list[dict[str, Any]]) -> list[int]:
    spans = [1] * len(sub_projects)
    i = 0
    while i < len(sub_projects):
        text = (sub_projects[i].get("outcome") or "").strip()
        if not text:
            spans[i] = 1
            i += 1
            continue
        j = i + 1
        while j < len(sub_projects) and (sub_projects[j].get("outcome") or "").strip() == text:
            j += 1
        span = j - i
        spans[i] = span
        for k in range(i + 1, j):
            spans[k] = 0
        i = j
    return spans


def build_purpose_goals_hwpx_table(form_data: dict[str, Any]) -> HwpxTable | None:
    sub_projects = form_data.get("subProjects") or []
    if not sub_projects:
        return None

    purpose_text = (
        format_line_slot_text(
            "\n".join(parse_line_slots(str(form_data.get("purpose") or "")))
            or line_slot_display_value(str(form_data.get("purpose") or ""))
        )
        or "-"
    )
    outcome_spans = _compute_outcome_row_spans(sub_projects)

    body_rows: list[list[HwpxTableCell]] = []
    for index, sub in enumerate(sub_projects):
        cells: list[HwpxTableCell] = []
        if index == 0:
            cells.append(
                HwpxTableCell(
                    text=purpose_text,
                    row_span=len(sub_projects),
                )
            )
        cells.append(
            HwpxTableCell(
                text=_format_goal_output_text(
                    str(sub.get("name") or ""),
                    str(sub.get("output") or ""),
                )
            )
        )
        span = outcome_spans[index]
        if span > 0:
            cells.append(
                HwpxTableCell(
                    text=(sub.get("outcome") or "").strip() or "-",
                    row_span=span if span > 1 else None,
                )
            )
        body_rows.append(cells)

    return HwpxTable(
        col_widths=[12000, 15260, 15260],
        rows=[
            [
                HwpxTableCell(text="목적", header=True, row_span=2),
                HwpxTableCell(text="목표", header=True, col_span=2),
            ],
            [
                HwpxTableCell(text="산출목표", header=True),
                HwpxTableCell(text="성과목표", header=True),
            ],
            *body_rows,
        ],
    )
