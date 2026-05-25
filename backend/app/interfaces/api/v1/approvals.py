from typing import Any

from fastapi import APIRouter, Depends, Query, status

from app.application.services.region_store_service import RegionStoreService
from app.interfaces.api.deps import get_region_store_service, require_region_id

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("")
def list_approvals(
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
    status: str | None = Query(default=None),
):
    return service.list_approvals(region_id, status=status)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_approval(
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.create_approval(region_id, body)


@router.patch("/{approval_id}")
def update_approval(
    approval_id: str,
    body: dict[str, Any],
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.update_approval(region_id, approval_id, body)


@router.delete("/{approval_id}")
def delete_approval(
    approval_id: str,
    region_id: str = Depends(require_region_id),
    service: RegionStoreService = Depends(get_region_store_service),
):
    return service.delete_approval(region_id, approval_id)
