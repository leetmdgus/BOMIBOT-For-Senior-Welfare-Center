"""REST 저장 후 실시간 방송 + 방 이름 헬퍼."""

from __future__ import annotations

from typing import Any

from app.infrastructure.realtime.hub import realtime_hub


def kanban_room(region_id: str, year: str) -> str:
    return f"region:{region_id}:kanban:{year}"


def task_document_room(region_id: str, task_id: str, document: str) -> str:
    return f"region:{region_id}:task:{task_id}:{document}"


async def broadcast(
    room: str,
    event_type: str,
    *,
    payload: dict[str, Any] | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
) -> None:
    message: dict[str, Any] = {
        "type": event_type,
        "room": room,
        "payload": payload or {},
    }
    if user_id:
        message["userId"] = user_id
    if user_name:
        message["userName"] = user_name
    await realtime_hub.broadcast(room, message)


async def broadcast_kanban_refresh(
    region_id: str,
    year: str,
    *,
    project_id: str,
    action: str,
    user_name: str = "시스템",
    extra: dict[str, Any] | None = None,
) -> None:
    body: dict[str, Any] = {
        "projectId": project_id,
        "action": action,
    }
    if extra:
        body.update(extra)
    await broadcast(
        kanban_room(region_id, year),
        "kanban.refresh",
        payload=body,
        user_name=user_name,
    )


async def broadcast_document_saved(
    region_id: str,
    task_id: str,
    document: str,
    saved: dict[str, Any],
    *,
    user_name: str = "시스템",
) -> None:
    await broadcast(
        task_document_room(region_id, task_id, document),
        "document.saved",
        payload=saved,
        user_name=user_name,
    )
