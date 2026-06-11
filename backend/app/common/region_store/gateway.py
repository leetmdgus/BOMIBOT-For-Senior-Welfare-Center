"""region_json_stores 읽기/쓰기 게이트웨이 (application 공통)."""

from __future__ import annotations

from copy import deepcopy

from fastapi import HTTPException, status

from app.common.domain.region_store.repository import RegionJsonStoreRepository


class RegionStoreGateway:
    """JSON blob load/save — use-case 레이어 공통 인프라."""

    def __init__(self, repo: RegionJsonStoreRepository) -> None:
        self._repo = repo

    @property
    def repository(self) -> RegionJsonStoreRepository:
        return self._repo

    def get_payload(self, region_id: str, domain: str) -> dict | None:
        return self._repo.get_payload(region_id, domain)

    def load(self, region_id: str, domain: str) -> dict:
        payload = self._repo.get_payload(region_id, domain)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Region data not found: {domain}",
            )
        return payload

    def save(self, region_id: str, domain: str, payload: dict) -> dict:
        return self._repo.save_payload(region_id, domain, payload)

    def load_or_empty(
        self,
        region_id: str,
        domain: str,
        *,
        default: dict | None = None,
    ) -> dict:
        payload = self._repo.get_payload(region_id, domain)
        if payload is None:
            return deepcopy(default) if default is not None else {}
        return payload
