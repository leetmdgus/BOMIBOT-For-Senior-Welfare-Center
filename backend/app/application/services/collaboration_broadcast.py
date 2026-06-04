"""실시간 협업(WebSocket) 제거됨 — 저장 후 방송은 no-op.

협업 WebSocket 허브를 제거했으므로 broadcast 함수는 아무 동작도 하지 않는다.
호출부(kanban·task_detail)를 수정하지 않도록 함수 시그니처만 유지한다.
"""

from __future__ import annotations

from typing import Any


async def broadcast_kanban_refresh(
    region_id: str,
    year: str,
    *,
    project_id: str,
    action: str,
    user_name: str = "시스템",
    extra: dict[str, Any] | None = None,
) -> None:
    return None


async def broadcast_document_saved(
    region_id: str,
    task_id: str,
    document: str,
    saved: dict[str, Any],
    *,
    user_name: str = "시스템",
) -> None:
    return None
