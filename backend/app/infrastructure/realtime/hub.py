"""In-memory WebSocket room hub (single-process)."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from fastapi import WebSocket

logger = logging.getLogger("bomibot.realtime")


@dataclass
class RealtimeConnection:
    websocket: WebSocket
    client_id: str
    user_id: str
    user_name: str
    region_id: str
    room: str
    focus: str | None = None


class RealtimeHub:
    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, RealtimeConnection]] = {}
        self._lock = asyncio.Lock()

    async def register(
        self,
        websocket: WebSocket,
        *,
        room: str,
        user_id: str,
        user_name: str,
        region_id: str,
    ) -> RealtimeConnection:
        client_id = str(uuid4())
        conn = RealtimeConnection(
            websocket=websocket,
            client_id=client_id,
            user_id=user_id,
            user_name=user_name,
            region_id=region_id,
            room=room,
        )
        async with self._lock:
            self._rooms.setdefault(room, {})[client_id] = conn
        return conn

    async def unregister(self, room: str, client_id: str) -> None:
        async with self._lock:
            bucket = self._rooms.get(room)
            if not bucket:
                return
            bucket.pop(client_id, None)
            if not bucket:
                self._rooms.pop(room, None)

    def list_presence(self, room: str) -> list[dict[str, Any]]:
        bucket = self._rooms.get(room, {})
        seen: set[str] = set()
        members: list[dict[str, Any]] = []
        for conn in bucket.values():
            key = f"{conn.user_id}:{conn.user_name}"
            if key in seen:
                continue
            seen.add(key)
            members.append(
                {
                    "userId": conn.user_id,
                    "userName": conn.user_name,
                    "focus": conn.focus,
                }
            )
        return members

    async def set_focus(self, room: str, client_id: str, focus: str | None) -> None:
        async with self._lock:
            conn = self._rooms.get(room, {}).get(client_id)
            if conn:
                conn.focus = focus

    async def broadcast(
        self,
        room: str,
        message: dict[str, Any],
        *,
        exclude_client_id: str | None = None,
    ) -> None:
        payload = json.dumps(message, ensure_ascii=False)
        async with self._lock:
            connections = list(self._rooms.get(room, {}).values())

        dead: list[tuple[str, str]] = []
        for conn in connections:
            if exclude_client_id and conn.client_id == exclude_client_id:
                continue
            try:
                await conn.websocket.send_text(payload)
            except Exception:
                dead.append((room, conn.client_id))

        for room_id, client_id in dead:
            await self.unregister(room_id, client_id)


realtime_hub = RealtimeHub()
