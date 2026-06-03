from copy import deepcopy

from sqlalchemy import select
from sqlalchemy.orm import Session

<<<<<<< HEAD
from app.infrastructure.persistence.models.region_json_store import RegionJsonStoreModel


class SqlAlchemyJsonStoreRepository:
=======
from app.domain.region_store.repository import RegionJsonStoreRepository
from app.infrastructure.persistence.models.region_json_store import RegionJsonStoreModel


class SqlAlchemyJsonStoreRepository(RegionJsonStoreRepository):
>>>>>>> dev2
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_payload(self, region_id: str, domain: str) -> dict | None:
        row = self._session.scalar(
            select(RegionJsonStoreModel).where(
                RegionJsonStoreModel.region_id == region_id,
                RegionJsonStoreModel.domain == domain,
            )
        )
        if not row:
            return None
        return deepcopy(row.payload)

    def save_payload(self, region_id: str, domain: str, payload: dict) -> dict:
        row = self._session.scalar(
            select(RegionJsonStoreModel).where(
                RegionJsonStoreModel.region_id == region_id,
                RegionJsonStoreModel.domain == domain,
            )
        )
        if row:
            row.payload = payload
        else:
            self._session.add(
                RegionJsonStoreModel(
                    region_id=region_id,
                    domain=domain,
                    payload=payload,
                )
            )
        self._session.flush()
        return deepcopy(payload)
