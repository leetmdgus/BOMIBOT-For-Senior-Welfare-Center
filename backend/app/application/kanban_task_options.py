"""칸반 보드의 업무(카드)를 파일 관리 담당 업무 목록으로 변환."""

from __future__ import annotations

from datetime import UTC, datetime

from app.application.kanban_access import KanbanAccessContext
from app.application.services.kanban_board_service import KanbanBoardService
from app.domain.scoped_ids import strip_scope


def _kanban_lookup_years() -> list[str]:
    current_year = str(datetime.now(UTC).year)
    return list(dict.fromkeys([current_year, "2026", "2025", "2024"]))


def list_kanban_task_options(
    kanban: KanbanBoardService,
    region_id: str,
    *,
    access: KanbanAccessContext | None = None,
) -> list[dict[str, str]]:
    """파일 담당 업무 선택 목록 — 칸반 카드명(업무명)만 표시."""
    options: list[dict[str, str]] = []
    seen: set[str] = set()

    for year in _kanban_lookup_years():
        for project in kanban.list_projects(region_id, year, access=access):
            for category in project.get("categories", []):
                for task in category.get("tasks", []):
                    task_id = strip_scope(str(task.get("id") or ""))
                    if not task_id or task_id in seen:
                        continue
                    seen.add(task_id)
                    task_title = str(task.get("title") or task_id).strip()
                    options.append({"id": task_id, "name": task_title})

    options.sort(key=lambda item: item["name"])
    return options


def resolve_kanban_task_name(
    kanban: KanbanBoardService,
    region_id: str,
    task_id: str,
    *,
    access: KanbanAccessContext | None = None,
) -> str | None:
    """담당 업무 표시명 = 칸반 카드명."""
    return resolve_kanban_card_title(kanban, region_id, task_id, access=access)


def resolve_kanban_card_title(
    kanban: KanbanBoardService,
    region_id: str,
    task_id: str,
    *,
    access: KanbanAccessContext | None = None,
) -> str | None:
    """칸반 업무 카드명(업무명). 사업계획·평가의 사업명과 동일하게 사용."""
    title = kanban.resolve_task_title(region_id, task_id)
    if title:
        return title

    needle = strip_scope(task_id)

    for year in _kanban_lookup_years():
        for project in kanban.list_projects(region_id, year, access=access):
            for category in project.get("categories", []):
                for task in category.get("tasks", []):
                    if strip_scope(str(task.get("id", ""))) != needle:
                        continue
                    title = task.get("title")
                    if title and str(title).strip():
                        return str(title).strip()
    return None


def apply_kanban_tasks_to_file_manager_state(
    state: dict,
    kanban: KanbanBoardService,
    region_id: str,
    *,
    access: KanbanAccessContext | None = None,
) -> dict:
    """taskOptions·파일 taskName을 칸반 카드명으로 동기화."""
    options = list_kanban_task_options(kanban, region_id, access=access)
    state["taskOptions"] = options
    by_id = {opt["id"]: opt["name"] for opt in options}
    for item in state.get("files") or []:
        task_id = item.get("taskId")
        if not task_id:
            continue
        tid = strip_scope(str(task_id))
        title = resolve_kanban_card_title(kanban, region_id, tid, access=access)
        if title:
            item["taskName"] = title
        elif tid in by_id:
            item["taskName"] = by_id[tid]
    return state
