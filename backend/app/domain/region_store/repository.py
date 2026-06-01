"""지역별 JSON 도메인 영속화 포트 (인프라 Session 비노출)."""

from abc import ABC, abstractmethod


class RegionJsonStoreRepository(ABC):
    """region_json_stores — 도메인 단위 blob get/save."""

    @abstractmethod
    def get_payload(self, region_id: str, domain: str) -> dict | None: ...

    @abstractmethod
    def save_payload(self, region_id: str, domain: str, payload: dict) -> dict: ...
