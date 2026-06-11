"""Build assistant data snapshot from region-scoped DB + JSON stores."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.modules.dashboard.service import DashboardService
from app.modules.kanban.service import KanbanBoardService
from app.modules.organization.service import OrganizationService
from app.common.region_store.service import RegionStoreService

MONTHS = [f"{i}월" for i in range(1, 13)]


def _empty_totals() -> dict[str, int]:
    return {
        "planPeople": 0,
        "planCount": 0,
        "planBudget": 0,
        "actualPeople": 0,
        "actualCount": 0,
        "actualExpense": 0,
    }


def _add_totals(base: dict[str, int], row: dict[str, Any]) -> dict[str, int]:
    return {
        "planPeople": base["planPeople"] + int(row.get("planPeople") or 0),
        "planCount": base["planCount"] + int(row.get("planCount") or 0),
        "planBudget": base["planBudget"] + int(row.get("planBudget") or 0),
        "actualPeople": base["actualPeople"] + int(row.get("actualPeople") or 0),
        "actualCount": base["actualCount"] + int(row.get("actualCount") or 0),
        "actualExpense": base["actualExpense"] + int(row.get("actualExpense") or 0),
    }


def _is_countable_row(row: dict[str, Any]) -> bool:
    sub = row.get("subProject") or ""
    return bool(sub) and sub != "선택"


def _build_performance_snapshot(rows: list[dict[str, Any]]) -> dict[str, Any]:
    countable = [r for r in rows if _is_countable_row(r)]
    by_month = {month: _empty_totals() for month in MONTHS}
    by_sub_project: dict[str, dict[str, int]] = {}
    totals = _empty_totals()

    for row in countable:
        totals = _add_totals(totals, row)
        month = row.get("month") or ""
        if month in by_month:
            by_month[month] = _add_totals(by_month[month], row)
        sub = row["subProject"]
        if sub not in by_sub_project:
            by_sub_project[sub] = _empty_totals()
        by_sub_project[sub] = _add_totals(by_sub_project[sub], row)

    return {
        "rowCount": len(countable),
        "totals": totals,
        "byMonth": by_month,
        "bySubProject": by_sub_project,
        "subProjects": sorted(by_sub_project.keys()),
    }


def _count_kanban(projects: list[dict[str, Any]]) -> dict[str, Any]:
    tasks_by_status: dict[str, int] = {}
    task_count = 0
    for project in projects:
        for category in project.get("categories", []):
            label = category.get("title", "")
            tasks = category.get("tasks", [])
            tasks_by_status[label] = tasks_by_status.get(label, 0) + len(tasks)
            task_count += len(tasks)
    return {
        "projectCount": len(projects),
        "taskCount": task_count,
        "tasksByStatus": tasks_by_status,
    }


def build_assistant_snapshot(
    region_id: str,
    *,
    region_store: RegionStoreService,
    dashboard_service: DashboardService,
    organization_service: OrganizationService,
    kanban_service: KanbanBoardService,
    year: str = "2026",
) -> dict[str, Any]:
    dashboard = dashboard_service.get_overview(region_id)
    org = organization_service.search(region_id)
    projects = kanban_service.list_projects(region_id, year)
    perf_rows = region_store.aggregate_input_management_rows(region_id)
    from app.common.region_store.service import DOMAIN_EBOOKS

    ebooks_payload = region_store.get_domain_payload(region_id, DOMAIN_EBOOKS)
    survey_list = region_store.list_surveys(region_id)

    departments = [d for d in org.get("departments", []) if d.get("id") != "all"]
    employee_count = sum(len(d.get("employees", [])) for d in departments)

    return {
        "generatedAt": datetime.now(UTC).isoformat(),
        "dashboard": {
            "stats": [
                {
                    "label": s["label"],
                    "value": s["value"],
                    "unit": s["unit"],
                    "description": s["description"],
                }
                for s in dashboard.get("stats", [])
            ],
            "progress": [
                {"label": p["label"], "value": p["value"]}
                for p in dashboard.get("progress", [])
            ],
        },
        "performance": _build_performance_snapshot(perf_rows),
        "kanban": _count_kanban(projects),
        "organization": {
            "departmentCount": len(departments),
            "employeeCount": employee_count,
        },
        "ebooks": {
            "bookCount": len(ebooks_payload.get("booksData", [])),
            "categories": list(ebooks_payload.get("categories", [])),
        },
        "surveys": {
            "totalCount": len(survey_list),
            "titles": [item.get("title", "") for item in survey_list],
        },
    }
