"""연간 보고서 실적관리 표 집계 — HTML/PDF 렌더러 공용.

입력관리 행(세부사업×월)을 **세부사업별로 압축 집계**한다.
연인원 = 인원 × 횟수(행별 곱의 합). 원천(재원)은 행의 funding 정보에서 수집.
"""

from __future__ import annotations

from typing import Any

# 재원(원천) 표기 순서 (PerformanceFundingSource)
_SOURCE_ORDER = ("경", "기", "비", "지", "법", "사", "잡")


def _int(value: Any) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _funding_sum(entries: Any) -> int:
    total = 0
    if isinstance(entries, list):
        for entry in entries:
            if isinstance(entry, dict):
                total += _int(entry.get("amount"))
    return total


def _row_sources(row: dict) -> set[str]:
    sources: set[str] = set()
    for key in ("planFunding", "actualFunding"):
        entries = row.get(key)
        if isinstance(entries, list):
            for entry in entries:
                if isinstance(entry, dict) and entry.get("source"):
                    sources.add(str(entry["source"]))
    fs = row.get("fundingSources")
    if isinstance(fs, list):
        for src in fs:
            if src:
                sources.add(str(src))
    return sources


def sorted_sources(sources: set[str]) -> str:
    ordered = [s for s in _SOURCE_ORDER if s in sources]
    extra = sorted(s for s in sources if s not in _SOURCE_ORDER)
    return ", ".join(ordered + extra)


def aggregate_performance(rows: Any) -> tuple[list[dict], dict]:
    """입력관리 행 → 세부사업별 집계 행 목록 + 합계.

    집계 행 키: subProject, sources(str), planYearly, planCount, planBudget,
    actualYearly, actualCount, actualExpense. 연인원(*Yearly) = Σ(인원 × 횟수).
    """
    data_rows = [r for r in (rows or []) if isinstance(r, dict)]
    groups: dict[tuple[str, str], dict] = {}
    order: list[tuple[str, str]] = []
    for row in data_rows:
        sub = str(row.get("subProject") or "").strip() or "(미지정)"
        detail = str(row.get("detailCategory") or "").strip()
        key = (sub, detail)
        if key not in groups:
            order.append(key)
            groups[key] = {
                "subProject": sub,
                "detailCategory": detail,
                "sources": set(),
                "planYearly": 0,
                "planCount": 0,
                "planBudget": 0,
                "actualYearly": 0,
                "actualCount": 0,
                "actualExpense": 0,
            }
        grp = groups[key]
        pp, pc = _int(row.get("planPeople")), _int(row.get("planCount"))
        ap, ac = _int(row.get("actualPeople")), _int(row.get("actualCount"))
        grp["planYearly"] += pp * pc
        grp["planCount"] += pc
        grp["planBudget"] += _int(row.get("planBudget")) or _funding_sum(
            row.get("planFunding")
        )
        grp["actualYearly"] += ap * ac
        grp["actualCount"] += ac
        grp["actualExpense"] += _int(row.get("actualExpense")) or _funding_sum(
            row.get("actualFunding")
        )
        grp["sources"] |= _row_sources(row)

    result: list[dict] = []
    totals = {
        "planYearly": 0,
        "planCount": 0,
        "planBudget": 0,
        "actualYearly": 0,
        "actualCount": 0,
        "actualExpense": 0,
    }
    all_sources: set[str] = set()
    for key in order:
        grp = groups[key]
        result.append({**grp, "sources": sorted_sources(grp["sources"])})
        for field in totals:
            totals[field] += grp[field]
        all_sources |= grp["sources"]
    totals["sources"] = sorted_sources(all_sources)
    return result, totals
