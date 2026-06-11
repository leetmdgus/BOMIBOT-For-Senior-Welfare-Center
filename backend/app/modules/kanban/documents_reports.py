"""사업문서(실적·예산·사업계획) — 칸반 실적관리 업무 입력 데이터 집계."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Callable

FUNDING_SOURCE_LABELS: dict[str, str] = {
    "경": "경상보조금",
    "기": "기타보조금",
    "비": "비지정후원금",
    "지": "지정후원금",
    "법": "법인전입금",
    "사": "사업수익",
    "잡": "잡수입",
}

FUNDING_TO_BUDGET_COLUMN: dict[str, str] = {
    "사": "income",
    "경": "subsidy",
    "기": "subsidy",
    "비": "sponsor",
    "지": "sponsor",
    "법": "transfer",
    "잡": "misc",
}

BUDGET_COLUMNS = ("income", "subsidy", "sponsor", "transfer", "misc")


def parse_month_number(month_label: str) -> int | None:
    match = re.match(r"^(\d{1,2})\s*월", str(month_label or "").strip())
    if not match:
        return None
    value = int(match.group(1))
    if 1 <= value <= 12:
        return value
    return None


def months_for_period(quarter: int, period_mode: str) -> set[int]:
    q = max(1, min(4, int(quarter or 1)))
    start = (q - 1) * 3 + 1
    end = q * 3
    if period_mode == "month":
        return {start}
    return set(range(start, end + 1))


def months_for_year() -> set[int]:
    return set(range(1, 13))


def filter_rows_by_period(
    rows: list[dict[str, Any]],
    *,
    quarter: int,
    period_mode: str,
) -> list[dict[str, Any]]:
    allowed = months_for_period(quarter, period_mode)
    return _filter_rows_by_months(rows, allowed)


def filter_rows_by_year(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return _filter_rows_by_months(rows, months_for_year())


def _filter_rows_by_months(
    rows: list[dict[str, Any]],
    allowed: set[int],
) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for row in rows:
        month_num = parse_month_number(str(row.get("month", "")))
        if month_num is None or month_num not in allowed:
            continue
        filtered.append(row)
    return filtered


def plan_funding_entries(row: dict[str, Any]) -> list[dict[str, Any]]:
    entries = row.get("planFunding")
    if isinstance(entries, list) and entries:
        return [
            {
                "source": str(item.get("source") or "사"),
                "amount": int(item.get("amount") or 0),
            }
            for item in entries
        ]
    plan_budget = int(row.get("planBudget") or 0)
    if plan_budget > 0:
        sources = row.get("fundingSources") or []
        source = str(sources[0] if sources else "사")
        return [{"source": source, "amount": plan_budget}]
    return []


def aggregate_input_rows(rows: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, int]]:
    grouped: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {
            "planPeople": 0,
            "actualPeople": 0,
            "planCount": 0,
            "actualCount": 0,
            "planBudget": 0,
            # 연인원 = Σ(인원 × 횟수). 합계의 곱이 아니라 행별 곱의 합으로 누적.
            "planYearlyPeople": 0,
            "actualYearlyPeople": 0,
        }
    )
    for row in rows:
        key = (
            str(row.get("subProject") or "").strip(),
            str(row.get("detailCategory") or "").strip(),
        )
        bucket = grouped[key]
        plan_people = int(row.get("planPeople") or 0)
        plan_count = int(row.get("planCount") or 0)
        actual_people = int(row.get("actualPeople") or 0)
        actual_count = int(row.get("actualCount") or 0)
        bucket["planPeople"] += plan_people
        bucket["actualPeople"] += actual_people
        bucket["planCount"] += plan_count
        bucket["actualCount"] += actual_count
        bucket["planBudget"] += int(row.get("planBudget") or 0)
        bucket["planYearlyPeople"] += plan_people * plan_count
        bucket["actualYearlyPeople"] += actual_people * actual_count
    return dict(grouped)


def aggregate_sub_projects(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "people": 0,
            "count": 0,
            "budget": 0,
            "contents": [],
            "funding_by_source": defaultdict(int),
        }
    )
    for row in rows:
        name = str(row.get("subProject") or "").strip() or "미분류"
        bucket = grouped[name]
        bucket["people"] += int(row.get("planPeople") or 0)
        bucket["count"] += int(row.get("planCount") or 0)
        bucket["budget"] += int(row.get("planBudget") or 0)
        content = str(row.get("content") or "").strip()
        if content and content not in bucket["contents"]:
            bucket["contents"].append(content)
        for entry in plan_funding_entries(row):
            bucket["funding_by_source"][entry["source"]] += entry["amount"]
    return dict(grouped)


def _zero_input_metrics() -> dict[str, int]:
    return {
        "planPeople": 0,
        "actualPeople": 0,
        "planCount": 0,
        "actualCount": 0,
        "planBudget": 0,
        "planYearlyPeople": 0,
        "actualYearlyPeople": 0,
    }


def resolve_aggregated_for_period(
    raw_rows: list[dict[str, Any]],
    *,
    quarter: int,
    period_mode: str,
    task_title: str,
) -> dict[tuple[str, str], dict[str, int]]:
    """분기 필터 → 연간 → 전체 → 없으면 사업명 기준 0 행."""
    filtered = filter_rows_by_period(
        raw_rows,
        quarter=quarter,
        period_mode=period_mode,
    )
    aggregated = aggregate_input_rows(filtered)
    if aggregated:
        return aggregated

    yearly = aggregate_input_rows(filter_rows_by_year(raw_rows))
    if yearly:
        return yearly

    all_rows = aggregate_input_rows(raw_rows)
    if all_rows:
        return all_rows

    label = str(task_title or "").strip() or "미분류"
    return {(label, "—"): _zero_input_metrics()}


def iter_kanban_report_tasks(
    projects: list[dict[str, Any]],
    year: int | str,
) -> list[dict[str, Any]]:
    """선택 연도 칸반 프로젝트의 모든 컬럼·업무 카드."""
    year_str = str(year).strip()
    tasks: list[dict[str, Any]] = []
    for project in projects:
        if str(project.get("year") or "").strip() != year_str:
            continue
        major_category = str(project.get("title") or "").strip()
        project_number = str(project.get("number") or "").strip()
        for category in project.get("categories") or []:
            category_title = str(category.get("title") or "").strip()
            for task in category.get("tasks") or []:
                task_id = str(task.get("id") or "").strip()
                if not task_id:
                    continue
                tasks.append(
                    {
                        "taskId": task_id,
                        "taskTitle": str(task.get("title") or "").strip() or task_id,
                        "majorCategory": major_category,
                        "projectNumber": project_number,
                        "categoryTitle": category_title,
                    }
                )
    return tasks


# 하위 호환
iter_performance_tasks = iter_kanban_report_tasks


def _empty_performance_row() -> dict[str, Any]:
    return {
        "majorCategory": "",
        "projectName": "",
        "subProjectName": "",
        "detailCategory": "",
        "planPeople": 0,
        "actualPeople": 0,
        "planCount": 0,
        "actualCount": 0,
        "planBudget": 0,
        "planYearlyPeople": 0,
        "actualYearlyPeople": 0,
        "rowType": "data",
    }


def _build_performance_task_block(
    *,
    major_category: str,
    project_name: str,
    aggregated: dict[tuple[str, str], dict[str, int]],
    include_major_on_first: bool,
) -> list[dict[str, Any]]:
    if not aggregated:
        return []

    sorted_keys = sorted(aggregated.keys(), key=lambda item: (item[0], item[1]))
    block: list[dict[str, Any]] = []
    totals = {
        "planPeople": 0,
        "actualPeople": 0,
        "planCount": 0,
        "actualCount": 0,
        "planBudget": 0,
        "planYearlyPeople": 0,
        "actualYearlyPeople": 0,
    }

    for index, (sub_project, detail_category) in enumerate(sorted_keys):
        metrics = aggregated[(sub_project, detail_category)]
        row = _empty_performance_row()
        if index == 0 and include_major_on_first:
            row["majorCategory"] = major_category
        row["projectName"] = project_name if index == 0 else ""
        row["subProjectName"] = sub_project
        row["detailCategory"] = detail_category
        row.update(metrics)
        block.append(row)
        for key in totals:
            totals[key] += metrics[key]

    block[0]["projectNameRowSpan"] = len(block) + 1

    subtotal = _empty_performance_row()
    subtotal["rowType"] = "subtotal"
    subtotal["projectName"] = f"사업 소계 > {project_name} 소계"
    subtotal.update(totals)
    block.append(subtotal)

    return block


def build_performance_report_rows(
    projects: list[dict[str, Any]],
    get_task_rows: Callable[[str, str | None], list[dict[str, Any]]],
    *,
    year: int | str,
    quarter: int = 1,
    period_mode: str = "quarter",
) -> list[dict[str, Any]]:
    year_str = str(year).strip()
    report_rows: list[dict[str, Any]] = []

    for project in projects:
        if str(project.get("year") or "").strip() != year_str:
            continue

        major_category = str(project.get("title") or "").strip()
        major_block: list[dict[str, Any]] = []

        for category in project.get("categories") or []:
            for task in category.get("tasks") or []:
                task_id = str(task.get("id") or "").strip()
                if not task_id:
                    continue
                task_title = str(task.get("title") or "").strip() or task_id
                raw_rows = get_task_rows(task_id, task_title)
                aggregated = resolve_aggregated_for_period(
                    raw_rows,
                    quarter=quarter,
                    period_mode=period_mode,
                    task_title=task_title,
                )
                task_block = _build_performance_task_block(
                    major_category=major_category,
                    project_name=task_title,
                    aggregated=aggregated,
                    include_major_on_first=not major_block,
                )
                major_block.extend(task_block)

        if not major_block:
            continue

        major_block[0]["majorCategory"] = major_category
        major_block[0]["majorCategoryRowSpan"] = len(major_block)
        report_rows.extend(major_block)

    return report_rows


def _empty_budget_columns() -> dict[str, int]:
    return {column: 0 for column in BUDGET_COLUMNS}


def _budget_row(
    *,
    mok: str,
    columns: dict[str, int],
    row_type: str = "data",
    gwan: str = "사업비",
    hang: str = "사업비",
) -> dict[str, Any]:
    amount = sum(columns.values())
    return {
        "gwan": gwan,
        "hang": hang,
        "mok": mok,
        "budgetCurrent": amount,
        "budgetPrevious": 0,
        "income": columns["income"],
        "subsidy": columns["subsidy"],
        "sponsor": columns["sponsor"],
        "transfer": columns["transfer"],
        "misc": columns["misc"],
        "amount": amount,
        "ratio": "0%",
        "rowType": row_type,
    }


def _format_funding_content(funding_by_source: dict[str, int]) -> str:
    parts: list[str] = []
    for code in ("사", "경", "기", "비", "지", "법", "잡"):
        amount = funding_by_source.get(code, 0)
        if amount > 0:
            label = FUNDING_SOURCE_LABELS.get(code, code)
            parts.append(f"{label} {amount:,}")
    return " · ".join(parts) if parts else "—"


def build_budget_report_rows(
    projects: list[dict[str, Any]],
    get_task_rows: Callable[[str, str | None], list[dict[str, Any]]],
    *,
    year: int | str,
) -> list[dict[str, Any]]:
    data_rows: list[dict[str, Any]] = []
    grand_columns = _empty_budget_columns()

    for meta in iter_kanban_report_tasks(projects, year):
        raw_rows = get_task_rows(meta["taskId"], meta["taskTitle"])
        filtered = filter_rows_by_year(raw_rows) or raw_rows
        task_columns = _empty_budget_columns()

        for row in filtered:
            for entry in plan_funding_entries(row):
                column = FUNDING_TO_BUDGET_COLUMN.get(entry["source"], "misc")
                task_columns[column] += entry["amount"]

        task_amount = sum(task_columns.values())
        non_zero_columns = [col for col in BUDGET_COLUMNS if task_columns[col] > 0]
        if not non_zero_columns:
            data_rows.append(
                _budget_row(mok=meta["taskTitle"], columns=task_columns),
            )
        elif len(non_zero_columns) == 1:
            data_rows.append(
                _budget_row(mok=meta["taskTitle"], columns=task_columns),
            )
        else:
            for column in non_zero_columns:
                split = _empty_budget_columns()
                split[column] = task_columns[column]
                data_rows.append(_budget_row(mok=meta["taskTitle"], columns=split))

        for column in BUDGET_COLUMNS:
            grand_columns[column] += task_columns[column]

    if not data_rows:
        return []

    grand_total = sum(grand_columns.values())

    for row in data_rows:
        amount = int(row.get("amount") or 0)
        row["ratio"] = (
            f"{round(100 * amount / grand_total)}%" if grand_total else "0%"
        )

    total_row = _budget_row(
        mok="합계",
        columns=grand_columns,
        row_type="total",
        gwan="",
        hang="",
    )
    total_row["ratio"] = "100%"

    return [total_row, *data_rows]


def _lookup_sub_project_meta(
    business_plan: dict[str, Any] | None,
    sub_project_name: str,
) -> dict[str, str]:
    if not business_plan:
        return {}
    form = business_plan.get("formData") or {}
    for item in form.get("subProjects") or []:
        if str(item.get("name") or "").strip() == sub_project_name:
            return {
                "purpose": str(item.get("outcome") or item.get("output") or "").strip(),
                "evaluation": str(item.get("outcome") or "").strip(),
            }
    return {}


def build_business_plan_report(
    projects: list[dict[str, Any]],
    get_task_rows: Callable[[str, str | None], list[dict[str, Any]]],
    get_business_plan: Callable[[str, str | None], dict[str, Any] | None],
    *,
    year: int | str,
) -> dict[str, Any]:
    year_str = str(year).strip()
    report_projects: list[dict[str, Any]] = []
    total_people = 0
    total_count = 0
    total_budget = 0
    task_count = 0

    for meta in iter_kanban_report_tasks(projects, year):
        raw_rows = get_task_rows(meta["taskId"], meta["taskTitle"])
        filtered = filter_rows_by_year(raw_rows)
        sub_projects = aggregate_sub_projects(filtered)
        if not sub_projects:
            title = meta["taskTitle"]
            sub_projects = {
                title: {
                    "people": 0,
                    "count": 0,
                    "budget": 0,
                    "contents": [],
                    "funding_by_source": {},
                }
            }

        task_count += 1
        business_plan = get_business_plan(meta["taskId"], meta["taskTitle"])
        form = (business_plan or {}).get("formData") or {}

        items: list[dict[str, Any]] = []
        subtotal_people = 0
        subtotal_count = 0
        subtotal_budget = 0
        subtotal_funding: dict[str, int] = defaultdict(int)

        for name in sorted(sub_projects.keys()):
            bucket = sub_projects[name]
            sub_meta = _lookup_sub_project_meta(business_plan, name)
            people = int(bucket["people"])
            count = int(bucket["count"])
            budget = int(bucket["budget"])
            subtotal_people += people
            subtotal_count += count
            subtotal_budget += budget
            total_people += people
            total_count += count
            total_budget += budget

            for code, amount in bucket["funding_by_source"].items():
                subtotal_funding[code] += amount

            method = " · ".join(bucket["contents"]) if bucket["contents"] else (
                str(form.get("purpose") or "").strip() or "—"
            )

            items.append(
                {
                    "name": name,
                    "people": people,
                    "count": count,
                    "budget": budget,
                    "purpose": sub_meta.get("purpose")
                    or str(form.get("purpose") or "").strip()
                    or "—",
                    "target": str(form.get("target") or "").strip() or "—",
                    "period": str(form.get("period") or "").strip()
                    or f"{year_str}.01.01 ~ {year_str}.12.31",
                    "method": method,
                    "evaluation": sub_meta.get("evaluation")
                    or str(form.get("evaluationTool") or "").strip()
                    or "내부기안(실적보고서)",
                }
            )

        report_projects.append(
            {
                "category": meta["projectNumber"] or meta["majorCategory"],
                "subCategory": meta["taskTitle"],
                "subtotal": {
                    "people": subtotal_people,
                    "count": subtotal_count,
                    "budget": subtotal_budget,
                    "content": _format_funding_content(dict(subtotal_funding)),
                },
                "items": items,
            }
        )

    return {
        "stats": [
            {
                "label": "총 사업 수",
                "value": str(task_count),
                "color": "text-sky-600",
            },
            {
                "label": "총 연인원",
                "value": f"{total_people:,}",
                "unit": "명",
                "color": "text-emerald-600",
            },
            {
                "label": "총 연횟수",
                "value": f"{total_count:,}",
                "unit": "회",
                "color": "text-violet-600",
            },
            {
                "label": "총 예산",
                "value": f"{total_budget:,}",
                "unit": "원",
                "color": "text-amber-600",
            },
        ],
        "projects": report_projects,
    }
