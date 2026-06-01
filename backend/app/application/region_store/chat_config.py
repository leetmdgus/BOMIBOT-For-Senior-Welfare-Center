"""챗봇 설정 — chat JSON bounded context."""

from __future__ import annotations

from copy import deepcopy

from app.application.region_store.gateway import RegionStoreGateway
from app.domain.region_store.constants import DOMAIN_CHAT


class ChatConfigApplicationService:
    def __init__(self, gateway: RegionStoreGateway) -> None:
        self._gateway = gateway

    def get(self, region_id: str) -> dict:
        return deepcopy(self._gateway.load(region_id, DOMAIN_CHAT))

    def save(self, region_id: str, body: dict) -> dict:
        current = self._gateway.load(region_id, DOMAIN_CHAT)
        if "cs" in body:
            current["cs"] = {**current.get("cs", {}), **body["cs"]}
        if "assistant" in body:
            current["assistant"] = {**current.get("assistant", {}), **body["assistant"]}
        for key, value in body.items():
            if key not in ("cs", "assistant"):
                current[key] = value
        self._gateway.save(region_id, DOMAIN_CHAT, current)
        return deepcopy(current)
