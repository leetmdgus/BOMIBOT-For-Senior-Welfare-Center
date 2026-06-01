"""칸반 담당자 이름 파싱·매칭·프로젝트 manager 동기화."""

from __future__ import annotations

import re

from app.domain.repositories.kanban_repository import KanbanProjectRecord

_NAME_SPLIT = re.compile(r"[,/;|、]")
_TITLE_SUFFIX = re.compile(
    r"(사회복지사|생활지원사|요양보호사|관리자|팀장|주무|담당|과장|대리|사원|선생님)$"
)


def normalize_person_token(name: str) -> str:
    token = re.sub(r"\s+", "", (name or "").strip())
    return _TITLE_SUFFIX.sub("", token)


def parse_assignee_names(field: str | None) -> list[str]:
    if not field:
        return []
    names: list[str] = []
    seen: set[str] = set()
    for part in _NAME_SPLIT.split(str(field)):
        raw = part.strip()
        if not raw:
            continue
        normalized = normalize_person_token(raw)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        names.append(raw.strip())
    return names


def person_matches_text(person_name: str, field: str | None) -> bool:
    """담당자 목록에 이름이 정확히 포함되는지 (부분 문자열 오매칭 방지)."""
    if not person_name or not field:
        return False
    person = normalize_person_token(person_name)
    if not person:
        return False
    for part in parse_assignee_names(str(field)):
        segment = normalize_person_token(part)
        if segment and person == segment:
            return True
    return False


def collect_project_participant_names(project: KanbanProjectRecord) -> list[str]:
    """프로젝트 manager + 모든 업무 assignee에 등장하는 담당자 이름(중복 제거)."""
    merged: list[str] = []
    seen: set[str] = set()
    for field in [project.manager]:
        for name in parse_assignee_names(field):
            key = normalize_person_token(name)
            if key in seen:
                continue
            seen.add(key)
            merged.append(name)
    for category in project.categories:
        for task in category.tasks:
            for name in parse_assignee_names(task.assignee):
                key = normalize_person_token(name)
                if key in seen:
                    continue
                seen.add(key)
                merged.append(name)
    return merged


def format_participant_names(names: list[str]) -> str:
    return ", ".join(names)


def merged_manager_from_project(project: KanbanProjectRecord) -> str:
    return format_participant_names(collect_project_participant_names(project))
