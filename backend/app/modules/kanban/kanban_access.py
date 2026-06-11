"""칸반 사업·업무·서류 — 담당자 / 팀장(소속 팀) / 관리자 접근."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.modules.kanban.kanban_assignee_names import person_matches_text
from app.modules.organization.permissions import OrgActor
from app.common.domain.repositories.kanban_repository import (
    KanbanProjectRecord,
    KanbanTaskRecord,
)
from app.common.domain.scoped_ids import strip_scope


def _normalize_team_label(value: str) -> str:
    return re.sub(r"\s+", "", value.strip())


def team_scope_matches(actor_department: str, project_team: str | None) -> bool:
    """사업 `team` 필드와 직원 소속 부서가 같은 팀인지."""
    if not actor_department or not project_team:
        return False
    left = _normalize_team_label(actor_department)
    right = _normalize_team_label(str(project_team))
    if not left or not right:
        return False
    if left == right:
        return True
    return left in right or right in left


@dataclass(frozen=True)
class KanbanAccessContext:
    user_name: str
    employee_id: str | None
    department: str
    bypass: bool
    is_team_leader: bool

    @classmethod
    def from_actor(cls, actor: OrgActor, *, display_name: str) -> KanbanAccessContext:
        employee = actor.employee
        name = (display_name or (employee.name if employee else "")).strip()
        employee_id = strip_scope(employee.id) if employee else None
        department = (employee.department if employee else "").strip()
        return cls(
            user_name=name,
            employee_id=employee_id,
            department=department,
            bypass=actor.is_admin,
            is_team_leader=bool(employee and employee.is_team_leader),
        )


def _task_assignee(task: dict) -> str:
    return str(task.get("assignee") or task.get("assignee_name") or "").strip()


def has_full_project_access_payload(
    project: dict, ctx: KanbanAccessContext
) -> bool:
    """사업 전체 카드 조회 — 관리자·팀장(소속 팀 사업)만."""
    if ctx.bypass:
        return True
    if ctx.is_team_leader and team_scope_matches(
        ctx.department, project.get("team")
    ):
        return True
    return False


def has_full_project_access_record(
    project: KanbanProjectRecord, ctx: KanbanAccessContext
) -> bool:
    if ctx.bypass:
        return True
    if ctx.is_team_leader and team_scope_matches(ctx.department, project.team):
        return True
    return False


def can_manage_project_payload(project: dict, ctx: KanbanAccessContext) -> bool:
    """사업 설정·업무 추가 — 관리자·팀장·사업 담당자(manager)."""
    if has_full_project_access_payload(project, ctx):
        return True
    if not ctx.user_name:
        return False
    return person_matches_text(ctx.user_name, project.get("manager"))


def can_manage_project_record(
    project: KanbanProjectRecord, ctx: KanbanAccessContext
) -> bool:
    if has_full_project_access_record(project, ctx):
        return True
    if not ctx.user_name:
        return False
    return person_matches_text(ctx.user_name, project.manager)


def can_access_task_payload(
    project: dict, task: dict, ctx: KanbanAccessContext
) -> bool:
    if has_full_project_access_payload(project, ctx):
        return True
    if not ctx.user_name:
        return False
    return person_matches_text(ctx.user_name, _task_assignee(task))


def can_access_task_record(
    project: KanbanProjectRecord, task: KanbanTaskRecord, ctx: KanbanAccessContext
) -> bool:
    if has_full_project_access_record(project, ctx):
        return True
    if not ctx.user_name:
        return False
    return person_matches_text(ctx.user_name, task.assignee)


def can_access_project_payload(project: dict, ctx: KanbanAccessContext) -> bool:
    """사업에 접근 가능한 카드가 하나라도 있으면 True (목록 노출용)."""
    if has_full_project_access_payload(project, ctx):
        return True
    for category in project.get("categories") or []:
        for task in category.get("tasks") or []:
            if can_access_task_payload(project, task, ctx):
                return True
    return False


def can_access_project_record(project: KanbanProjectRecord, ctx: KanbanAccessContext) -> bool:
    if has_full_project_access_record(project, ctx):
        return True
    for category in project.categories:
        for task in category.tasks:
            if can_access_task_record(project, task, ctx):
                return True
    return False


def _filter_categories_payload(
    project: dict, ctx: KanbanAccessContext
) -> list[dict[str, Any]]:
    if has_full_project_access_payload(project, ctx):
        return list(project.get("categories") or [])

    # 컬럼(카테고리) 자체는 항상 노출 — 접근 권한은 카드(태스크)에만 적용.
    # 빈 컬럼을 드롭하면 사업 추가 시 초기 태스크가 있는 컬럼만 보이는 문제가 생긴다.
    filtered: list[dict[str, Any]] = []
    for category in project.get("categories") or []:
        tasks = [
            task
            for task in category.get("tasks") or []
            if can_access_task_payload(project, task, ctx)
        ]
        filtered.append({**category, "tasks": tasks})
    return filtered


def filter_project_payloads(
    projects: list[dict], ctx: KanbanAccessContext | None
) -> list[dict]:
    if ctx is None or ctx.bypass:
        return projects

    result: list[dict] = []
    for project in projects:
        if not can_access_project_payload(project, ctx):
            continue
        categories = _filter_categories_payload(project, ctx)
        if not categories:
            continue
        result.append({**project, "categories": categories})
    return result


def collect_accessible_task_ids(
    projects: list[dict], ctx: KanbanAccessContext | None
) -> set[str] | None:
    """None = no filter (관리자 bypass)."""
    if ctx is None or ctx.bypass:
        return None
    allowed: set[str] = set()
    for project in filter_project_payloads(projects, ctx):
        for category in project.get("categories") or []:
            for task in category.get("tasks") or []:
                task_id = strip_scope(str(task.get("id") or ""))
                if task_id:
                    allowed.add(task_id)
    return allowed


def file_entry_allowed(entry: dict, allowed_task_ids: set[str] | None) -> bool:
    if allowed_task_ids is None:
        return True
    raw = entry.get("taskId") or entry.get("task_id")
    if not raw:
        return False
    return strip_scope(str(raw)) in allowed_task_ids


def _collect_descendant_ids(files: list[dict], folder_id: str) -> set[str]:
    by_parent: dict[str | None, list[str]] = {}
    for entry in files:
        entry_id = entry.get("id")
        if not entry_id:
            continue
        parent = entry.get("parentId")
        parent_key = str(parent) if parent else None
        by_parent.setdefault(parent_key, []).append(str(entry_id))

    result: set[str] = set()
    stack = list(by_parent.get(folder_id, []))
    while stack:
        child_id = stack.pop()
        if child_id in result:
            continue
        result.add(child_id)
        stack.extend(by_parent.get(child_id, []))
    return result


def filter_file_tree(
    files: list[dict], allowed_task_ids: set[str] | None
) -> list[dict]:
    """접근 가능한 파일 + 상위 폴더만 남김 (admin은 allowed_task_ids=None → 전체)."""
    if allowed_task_ids is None:
        return files

    by_id = {str(entry["id"]): entry for entry in files if entry.get("id")}
    visible: set[str] = set()

    def add_with_parents(file_id: str) -> None:
        current = file_id
        while current and current not in visible:
            item = by_id.get(current)
            if not item:
                break
            visible.add(current)
            parent = item.get("parentId")
            current = str(parent) if parent else ""

    for entry in files:
        if not file_entry_allowed(entry, allowed_task_ids):
            continue
        entry_id = str(entry["id"])
        add_with_parents(entry_id)
        if entry.get("type") == "folder":
            for child_id in _collect_descendant_ids(files, entry_id):
                child = by_id.get(child_id)
                if child and file_entry_allowed(child, allowed_task_ids):
                    add_with_parents(child_id)

    return [entry for entry in files if str(entry.get("id")) in visible]


def assert_file_tree_access(
    files: list[dict],
    file_id: str,
    allowed_task_ids: set[str] | None,
) -> dict:
    from fastapi import HTTPException, status

    if allowed_task_ids is None:
        target = next((entry for entry in files if str(entry.get("id")) == str(file_id)), None)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        return target

    visible = {
        str(entry["id"])
        for entry in filter_file_tree(files, allowed_task_ids)
        if entry.get("id")
    }
    if str(file_id) not in visible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 파일에 접근할 권한이 없습니다.",
        )
    target = next((entry for entry in files if str(entry.get("id")) == str(file_id)), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return target


def assert_files_payload_allowed(
    files: list[dict], allowed_task_ids: set[str] | None
) -> None:
    """저장 요청에 권한 없는 항목이 있으면 거부."""
    from fastapi import HTTPException, status

    if allowed_task_ids is None:
        return
    visible = {
        str(entry["id"])
        for entry in filter_file_tree(files, allowed_task_ids)
        if entry.get("id")
    }
    for entry in files:
        entry_id = entry.get("id")
        if not entry_id:
            continue
        if str(entry_id) not in visible:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="권한이 없는 파일을 저장할 수 없습니다.",
            )


def gather_accessible_task_ids(
    kanban: object,
    region_id: str,
    access: KanbanAccessContext,
    *,
    projects: list[dict] | None = None,
) -> set[str] | None:
    """All task ids the user may access (None = admin, no filter).

    projects 를 넘기면 연도별 list_projects 재조회 없이 그 목록만 사용한다.
    """
    if access.bypass:
        return None

    if projects is None:
        from app.modules.kanban.kanban_task_options import load_kanban_projects

        projects = load_kanban_projects(kanban, region_id, access=access)
    return collect_accessible_task_ids(projects, access)
