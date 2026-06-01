"""대시보드 지표 — 조직·칸반·실적(PerformanceReadPort) 실데이터 반영."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.domain.repositories.dashboard_repository import DashboardOverviewRecord
from app.domain.repositories.kanban_repository import KanbanBoardRepository
from app.domain.repositories.organization_repository import OrganizationRepository
from app.domain.repositories.performance_repository import PerformanceRepository

STAT_PERSONNEL = "인원 현황"
STAT_PROJECTS = "활성 프로젝트"
STAT_SERVICE_USERS = "서비스 이용자"

PROGRESS_PEOPLE = "인원 달성률"
PROGRESS_COUNT = "횟수 달성률"
PROGRESS_BUDGET = "예산 집행률"


def _achievement_percent(actual: int | float, plan: int | float) -> int:
    if plan <= 0:
        return 0 if actual <= 0 else 100
    return min(100, round(100 * float(actual) / float(plan)))


def count_region_employees(org_repo: OrganizationRepository, region_id: str) -> int:
    result = org_repo.search(region_id, search=None, department=None)
    seen: set[str] = set()
    for department in result.departments:
        for employee in department.employees:
            seen.add(employee.id)
    for employee in result.employees:
        seen.add(employee.id)
    return len(seen)


def _performance_totals(
    performance: PerformanceRepository,
    region_id: str,
) -> dict[str, int | float]:
    try:
        payload = performance.get_performance_rows(region_id)
    except Exception:
        return {}
    rows = payload.get("data") or []
    totals = payload.get("totals") or {}
    plan_budget = sum(int(row.get("planBudget") or 0) for row in rows)
    actual_expense = sum(int(row.get("actualExpense") or 0) for row in rows)
    return {
        "planPeople": int(totals.get("planPeople") or 0),
        "actualPeople": int(totals.get("actualPeople") or 0),
        "planCount": int(totals.get("planCount") or 0),
        "actualCount": int(totals.get("actualCount") or 0),
        "planBudget": plan_budget,
        "actualExpense": actual_expense,
    }


def apply_live_dashboard_metrics(
    payload: dict[str, Any],
    region_id: str,
    *,
    org_repo: OrganizationRepository | None,
    kanban_repo: KanbanBoardRepository | None,
    performance: PerformanceRepository | None = None,
    year: str | None = None,
) -> dict[str, Any]:
    year_str = year or str(datetime.now(UTC).year)
    employee_count: int | None = None
    project_count: int | None = None
    perf: dict[str, int | float] = {}

    if org_repo is not None:
        employee_count = count_region_employees(org_repo, region_id)
    if kanban_repo is not None:
        project_count = kanban_repo.count_projects(region_id, year_str)
    if performance is not None:
        perf = _performance_totals(performance, region_id)

    stats: list[dict[str, Any]] = list(payload.get("stats") or [])
    if not stats and (employee_count is not None or project_count is not None):
        stats = _default_stats_template()

    for stat in stats:
        label = str(stat.get("label") or "")
        if label == STAT_PERSONNEL and employee_count is not None:
            stat["value"] = str(employee_count)
            stat["unit"] = "명"
            stat["description"] = "조직현황 등록 직원 수"
        elif label == STAT_PROJECTS and project_count is not None:
            stat["value"] = str(project_count)
            stat["unit"] = "개"
            stat["description"] = f"{year_str}년 칸반 등록 사업 수"
        elif label == STAT_SERVICE_USERS and perf:
            actual_people = int(perf.get("actualPeople") or 0)
            stat["value"] = f"{actual_people:,}"
            stat["unit"] = "명"
            stat["description"] = "실적관리 누적 실적 인원 합계"

    progress: list[dict[str, Any]] = list(payload.get("progress") or [])
    if perf:
        rates = {
            PROGRESS_PEOPLE: _achievement_percent(
                int(perf.get("actualPeople") or 0),
                int(perf.get("planPeople") or 0),
            ),
            PROGRESS_COUNT: _achievement_percent(
                int(perf.get("actualCount") or 0),
                int(perf.get("planCount") or 0),
            ),
            PROGRESS_BUDGET: _achievement_percent(
                int(perf.get("actualExpense") or 0),
                int(perf.get("planBudget") or 0),
            ),
        }
        if not progress:
            progress = _default_progress_template()
        for item in progress:
            label = str(item.get("label") or "")
            if label in rates:
                item["value"] = rates[label]

    payload["stats"] = stats
    payload["progress"] = progress
    return payload


def _default_stats_template() -> list[dict[str, Any]]:
    return [
        {
            "label": STAT_PERSONNEL,
            "labelEn": "PERSONNEL STATUS",
            "value": "0",
            "unit": "명",
            "description": "조직현황 등록 직원 수",
            "iconName": "Users",
            "color": "bg-primary/10 text-primary",
            "link": "전체 직원 현황 보기",
            "goto": "/organization",
        },
        {
            "label": STAT_PROJECTS,
            "labelEn": "ACTIVE PROJECTS",
            "value": "0",
            "unit": "개",
            "description": "칸반 등록 사업 수",
            "iconName": "Layers",
            "color": "bg-primary/10 text-primary",
            "link": "사업계획 및 실적 관리",
            "goto": "/kanban",
        },
    ]


def _default_progress_template() -> list[dict[str, Any]]:
    return [
        {
            "label": PROGRESS_PEOPLE,
            "value": 0,
            "iconName": "Users",
            "color": "bg-primary",
            "textColor": "text-primary",
        },
        {
            "label": PROGRESS_COUNT,
            "value": 0,
            "iconName": "Calendar",
            "color": "bg-success",
            "textColor": "text-success",
        },
        {
            "label": PROGRESS_BUDGET,
            "value": 0,
            "iconName": "DollarSign",
            "color": "bg-[hsl(280,60%,50%)]",
            "textColor": "text-[hsl(280,60%,50%)]",
        },
    ]


def overview_record_to_payload(overview: DashboardOverviewRecord) -> dict[str, Any]:
    return {
        "stats": [
            {
                "label": s.label,
                "labelEn": s.label_en,
                "value": s.value,
                "unit": s.unit,
                "description": s.description,
                "iconName": s.icon_name,
                "color": s.color,
                "link": s.link,
                "showChart": s.show_chart,
                "goto": s.goto,
            }
            for s in overview.stats
        ],
        "progress": [
            {
                "label": p.label,
                "value": p.value,
                "iconName": p.icon_name,
                "color": p.color,
                "textColor": p.text_color,
            }
            for p in overview.progress
        ],
        "calendarEvents": [
            {
                "day": c.day,
                "title": c.title,
                "color": c.color,
                "category": c.category,
            }
            for c in overview.calendar_events
        ],
        "volunteerEvents": [
            {
                "id": v.id.split(":", 1)[-1] if ":" in v.id else v.id,
                "name": v.name,
                "program": v.program,
                "day": v.day,
                "status": v.status,
            }
            for v in overview.volunteer_events
        ],
    }
