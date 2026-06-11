from fastapi import APIRouter, Depends, Query

from app.modules.dashboard.service import DashboardService
from app.common.dependencies import get_dashboard_service, require_region_id

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    region_id: str = Depends(require_region_id),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    return dashboard_service.get_overview(region_id)

