from fastapi import APIRouter, Depends, Query

from app.application.services.dashboard_service import DashboardService
from app.interfaces.api.deps import get_dashboard_service, require_region_id

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    region_id: str = Depends(require_region_id),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    return dashboard_service.get_overview(region_id)

