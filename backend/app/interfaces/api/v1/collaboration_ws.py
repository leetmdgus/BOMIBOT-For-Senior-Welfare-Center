"""WebSocket — 노션 스타일 실시간 presence + 문서/칸반 동기화."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.infrastructure.realtime.hub import realtime_hub

logger = logging.getLogger("bomibot.ws")
router = APIRouter(tags=["collaboration"])

REGION_IDS = {"chuncheon-north", "chuncheon-east"}


def _validate_room(region_id: str, room: str) -> bool:
    prefix = f"region:{region_id}:"
    if not room.startswith(prefix):
        return False
    rest = room[len(prefix) :]
    if rest.startswith("kanban:"):
        return True
    if rest.startswith("task:") and rest.count(":") >= 2:
        return True
    return False


@router.websocket("/ws")
async def collaboration_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    room: str = Query(...),
):
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=4401, reason="Unauthorized")
        return

    region_id = str(payload.get("region_id") or "")
    if region_id not in REGION_IDS or not _validate_room(region_id, room):
        await websocket.close(code=4403, reason="Forbidden room")
        return

    user_id = str(payload["sub"])
    user_name = (websocket.query_params.get("userName") or "").strip() or "사용자"

    await websocket.accept()
    conn = await realtime_hub.register(
        websocket,
        room=room,
        user_id=user_id,
        user_name=user_name,
        region_id=region_id,
    )

    await websocket.send_text(
        json.dumps(
            {
                "type": "connected",
                "room": room,
                "clientId": conn.client_id,
                "presence": realtime_hub.list_presence(room),
            },
            ensure_ascii=False,
        )
    )

    await realtime_hub.broadcast(
        room,
        {
            "type": "presence.join",
            "room": room,
            "clientId": conn.client_id,
            "userId": user_id,
            "userName": user_name,
            "presence": realtime_hub.list_presence(room),
        },
        exclude_client_id=conn.client_id,
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}, ensure_ascii=False))
                continue

            if msg_type == "presence.focus":
                focus = data.get("focus")
                focus_str = str(focus) if focus is not None else None
                await realtime_hub.set_focus(room, conn.client_id, focus_str)
                await realtime_hub.broadcast(
                    room,
                    {
                        "type": "presence.update",
                        "room": room,
                        "clientId": conn.client_id,
                        "userId": user_id,
                        "userName": user_name,
                        "focus": focus_str,
                        "presence": realtime_hub.list_presence(room),
                    },
                    exclude_client_id=conn.client_id,
                )
                continue

            if msg_type in ("document.draft", "document.patch"):
                await realtime_hub.broadcast(
                    room,
                    {
                        "type": msg_type,
                        "room": room,
                        "clientId": conn.client_id,
                        "userId": user_id,
                        "userName": user_name,
                        "payload": data.get("payload") or {},
                    },
                    exclude_client_id=conn.client_id,
                )
                continue

            if msg_type == "kanban.refresh":
                await realtime_hub.broadcast(
                    room,
                    {
                        "type": "kanban.refresh",
                        "room": room,
                        "clientId": conn.client_id,
                        "userId": user_id,
                        "userName": user_name,
                        "payload": data.get("payload") or {},
                    },
                    exclude_client_id=conn.client_id,
                )
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WebSocket error room=%s: %s", room, exc)
    finally:
        await realtime_hub.unregister(room, conn.client_id)
        await realtime_hub.broadcast(
            room,
            {
                "type": "presence.leave",
                "room": room,
                "clientId": conn.client_id,
                "userId": user_id,
                "userName": user_name,
                "presence": realtime_hub.list_presence(room),
            },
        )
