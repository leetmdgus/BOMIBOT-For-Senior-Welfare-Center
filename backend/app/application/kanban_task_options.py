"""칸반 보드의 업무(카드)를 파일 관리 담당 업무 목록으로 변환."""

from __future__ import annotations

from datetime import UTC, datetime

from app.application.kanban_access import KanbanAccessContext
from app.application.services.kanban_board_service import KanbanBoardService
from app.domain.scoped_ids import strip_scope


def _kanban_lookup_years() -> list[str]:
    current_year = str(datetime.now(UTC).year)
    return list(dict.fromkeys([current_year, "2026", "2025", "2024"]))


def load_kanban_projects(
    kanban: KanbanBoardService,
    region_id: str,
    *,
    access: KanbanAccessContext | None = None,
) -> list[dict]:
    """대상 연도들의 칸반 프로젝트를 한 번만 로드.

    파일 관리 핸들러처럼 동일한 프로젝트 트리를 여러 번 필요로 하는 호출부가
    이 결과를 공유해 연도별 list_projects 중복 조회(N+1)를 없앤다.
    """
    projects: list[dict] = []
    for year in _kanban_lookup_years():
        projects.extend(kanban.list_projects(region_id, year, access=access))
    return projects


def list_kanban_task_options(
    kanban: KanbanBoardService,
    region_id: str,
    *,
    access: KanbanAccessContext | None = None,
    projects: list[dict] | None = None,
) -> list[dict[str, str]]:
    """파일 담당 업무 선택 목록 — 칸반 카드명(업무명)만 표시.

    projects 를 넘기면 재조회 없이 그 목록만 사용한다.
    """
    options: list[dict[str, str]] = []
    seen: set[str] = set()

    if projects is None:
        projects = load_kanban_projects(kanban, region_id, access=access)

    for project in projects:
        # 프로젝트 title = 대분류(사업명), title 아래 task = 중분류(프로그램)
        major = str(project.get("title") or "").strip()
        year = str(project.get("year") or "").strip()
        for category in project.get("categories", []):
            for task in category.get("tasks", []):
                task_id = strip_scope(str(task.get("id") or ""))
                if not task_id or task_id in seen:
                    continue
                seen.add(task_id)
                task_title = str(task.get("title") or task_id).strip()
                option: dict[str, str] = {"id": task_id, "name": task_title}
                if major:
                    option["majorCategory"] = major
                if year:
                    option["year"] = year
                options.append(option)

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
    projects: list[dict] | None = None,
) -> str | None:
    """칸반 업무 카드명(업무명). 사업계획·평가의 사업명과 동일하게 사용.

    projects 를 넘기면 폴백 스캔 시 연도별 재조회 없이 그 목록만 사용한다.
    """
    title = kanban.resolve_task_title(region_id, task_id)
    if title:
        return title

    needle = strip_scope(task_id)

    if projects is None:
        projects = load_kanban_projects(kanban, region_id, access=access)

    for project in projects:
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
    projects: list[dict] | None = None,
) -> dict:
    """taskOptions·파일 taskName을 칸반 카드명으로 동기화.

    projects 를 넘기면 옵션 목록·제목 인덱스를 그 목록에서만 만들고,
    파일별 제목은 인메모리 인덱스(by_id)로 우선 해석해 파일마다 연도별
    프로젝트를 다시 스캔하던 N+1 을 없앤다.
    """
    if projects is None:
        projects = load_kanban_projects(kanban, region_id, access=access)
    options = list_kanban_task_options(
        kanban, region_id, access=access, projects=projects
    )
    state["taskOptions"] = options
    by_id = {opt["id"]: opt["name"] for opt in options}
    for item in state.get("files") or []:
        task_id = item.get("taskId")
        if not task_id:
            continue
        tid = strip_scope(str(task_id))
        # 인메모리 인덱스가 모든 연도의 업무 제목을 이미 담고 있으므로 우선 사용.
        # 인덱스에 없을 때만(드묾) 단건 SQL/폴백으로 해석한다.
        if tid in by_id:
            item["taskName"] = by_id[tid]
            continue
        title = resolve_kanban_card_title(
            kanban, region_id, tid, access=access, projects=projects
        )
        if title:
            item["taskName"] = title
    return state
