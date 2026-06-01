"""Format assistant snapshot for LLM system prompt."""

from __future__ import annotations

from typing import Any


def format_assistant_data_context(snapshot: dict[str, Any]) -> str:
    performance = snapshot["performance"]
    dashboard = snapshot["dashboard"]
    kanban = snapshot["kanban"]
    organization = snapshot["organization"]
    ebooks = snapshot["ebooks"]
    surveys = snapshot["surveys"]

    month_lines = []
    for month, metrics in performance.get("byMonth", {}).items():
        if (
            metrics.get("planBudget", 0) > 0
            or metrics.get("actualExpense", 0) > 0
            or metrics.get("planPeople", 0) > 0
            or metrics.get("actualPeople", 0) > 0
        ):
            month_lines.append(
                f"  {month}: 계획 예산 {metrics['planBudget']:,}원 / "
                f"실적 지출 {metrics['actualExpense']:,}원 "
                f"(인원 계획 {metrics['planPeople']}·실적 {metrics['actualPeople']})"
            )

    sub_project_lines = []
    for name in performance.get("subProjects", []):
        metrics = performance.get("bySubProject", {}).get(name)
        if metrics:
            sub_project_lines.append(
                f"  {name}: 계획 예산 {metrics['planBudget']:,}원 / "
                f"실적 지출 {metrics['actualExpense']:,}원"
            )

    totals = performance.get("totals", {})
    stat_lines = [
        f"- {s['label']}: {s['value']}{s['unit']} ({s['description']})"
        for s in dashboard.get("stats", [])
    ]
    progress_lines = [f"- {p['label']}: {p['value']}%" for p in dashboard.get("progress", [])]

    return "\n".join(
        [
            f"데이터 기준 시각: {snapshot['generatedAt']}",
            "",
            "## 대시보드",
            *stat_lines,
            *progress_lines,
            "",
            f"## 계획/실적 입력 (행 {performance.get('rowCount', 0)}건)",
            f"- 전체 계획 예산: {totals.get('planBudget', 0):,}원",
            f"- 전체 실적 지출: {totals.get('actualExpense', 0):,}원",
            f"- 전체 계획 인원/횟수: {totals.get('planPeople', 0)}명 / {totals.get('planCount', 0)}회",
            f"- 전체 실적 인원/횟수: {totals.get('actualPeople', 0)}명 / {totals.get('actualCount', 0)}회",
            "- 월별:",
            *month_lines,
            "- 세목(세부사업명)별:",
            *sub_project_lines,
            "",
            "## 칸반",
            f"- 프로젝트 {kanban.get('projectCount', 0)}개, 업무 카드 {kanban.get('taskCount', 0)}건",
            *[
                f"  - {status}: {count}건"
                for status, count in kanban.get("tasksByStatus", {}).items()
            ],
            "",
            "## 조직",
            f"- 부서 {organization.get('departmentCount', 0)}개, 직원 {organization.get('employeeCount', 0)}명",
            "",
            "## 전자책",
            f"- 자료 {ebooks.get('bookCount', 0)}권, 카테고리: {', '.join(ebooks.get('categories', []))}",
            "",
            "## 설문",
            f"- 설문 {surveys.get('totalCount', 0)}개: {', '.join(surveys.get('titles', []))}",
        ]
    )
