"""사업계획서 세부사업명 ↔ 실적(performance) 세부사업명 동기화."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

_SKIP_SUB_PROJECT_NAMES = frozenset({"", "선택", "--", "—"})


def collect_performance_sub_project_names(
    *,
    chips: list[Any] | None,
    input_rows: list[Any] | None,
) -> list[str]:
    """실적 입력관리 칩 + 업무 행에서 세부사업명 목록 (순서 유지, 중복 제거)."""
    names: list[str] = []
    seen: set[str] = set()

    for chip in chips or []:
        if not isinstance(chip, dict):
            continue
        label = str(chip.get("label") or "").strip()
        if label in _SKIP_SUB_PROJECT_NAMES or label in seen:
            continue
        names.append(label)
        seen.add(label)

    for row in input_rows or []:
        if not isinstance(row, dict):
            continue
        sub = str(row.get("subProject") or "").strip()
        if sub in _SKIP_SUB_PROJECT_NAMES or sub in seen:
            continue
        names.append(sub)
        seen.add(sub)

    return names


def merge_plan_sub_projects(
    existing: list[dict[str, Any]] | None,
    performance_names: list[str],
) -> list[dict[str, Any]]:
    """실적 세부사업명 기준으로 사업계획서 subProjects 정렬·병합 (내용은 이름 매칭 유지)."""
    current = existing or []
    if not performance_names:
        return [deepcopy(item) for item in current]

    by_name: dict[str, dict[str, Any]] = {}
    for item in current:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if name:
            by_name[name] = deepcopy(item)

    merged: list[dict[str, Any]] = []
    for name in performance_names:
        if name in by_name:
            merged.append(by_name[name])
        else:
            merged.append({"name": name, "output": "", "outcome": ""})
    return merged


def merge_evaluation_detail_rows(
    existing: list[dict[str, Any]] | None,
    performance_names: list[str],
) -> list[dict[str, Any]]:
    """실적 세부사업명 → 평가서 detailRows (label=세부사업명, content 유지)."""
    current = existing or []
    if not performance_names:
        return [deepcopy(row) for row in current]

    by_label: dict[str, dict[str, Any]] = {}
    for row in current:
        if not isinstance(row, dict):
            continue
        label = str(row.get("label") or "").strip()
        if label:
            by_label[label] = deepcopy(row)

    merged: list[dict[str, Any]] = []
    for name in performance_names:
        if name in by_label:
            merged.append(by_label[name])
        else:
            merged.append({"label": name, "content": ""})
    return merged
