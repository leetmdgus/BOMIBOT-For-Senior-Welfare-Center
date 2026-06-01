"""표 AST grid 주소(rowAddr/colAddr) 정규화."""

from __future__ import annotations

from typing import Any


def normalize_table_grid(table: dict[str, Any]) -> dict[str, Any]:
    occupied: set[tuple[int, int]] = set()
    rows_out: list[dict[str, Any]] = []

    for row_index, row in enumerate(table.get("rows") or []):
        col_index = 0
        cells_out: list[dict[str, Any]] = []

        for cell in row.get("cells") or []:
            while (row_index, col_index) in occupied:
                col_index += 1

            next_cell = {
                **cell,
                "grid": {"row": row_index, "col": col_index},
            }

            row_span = int(next_cell.get("rowSpan") or 1)
            col_span = int(next_cell.get("colSpan") or 1)

            for r in range(row_span):
                for c in range(col_span):
                    occupied.add((row_index + r, col_index + c))

            col_index += col_span
            cells_out.append(next_cell)

        rows_out.append({**row, "cells": cells_out})

    return {**table, "rows": rows_out}


def calculate_cell_width(table: dict[str, Any], col: int, col_span: int) -> int:
    columns = table.get("columns") or []
    if not columns:
        return 120 * col_span

    total = 0
    for index in range(col, min(col + col_span, len(columns))):
        total += int(columns[index].get("width", 120))
    return total or 120 * col_span


def needed_column_count(table: dict[str, Any]) -> int:
    max_cols = len(table.get("columns") or []) or 1
    for row in table.get("rows") or []:
        span = sum(int(c.get("colSpan") or 1) for c in row.get("cells") or [])
        max_cols = max(max_cols, span)
    return max_cols
