"""하위 호환 — `app.domain.region_store.repository` 사용 권장."""

from app.common.domain.region_store.repository import RegionJsonStoreRepository

__all__ = ["RegionJsonStoreRepository"]
