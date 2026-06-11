"""대시보드 use-case."""

from datetime import UTC, datetime

from app.modules.dashboard.live_metrics import (
    apply_live_dashboard_metrics,
    overview_record_to_payload,
)
from app.common.domain.repositories.dashboard_repository import DashboardRepository
from app.common.domain.repositories.kanban_repository import KanbanBoardRepository
from app.common.domain.repositories.organization_repository import OrganizationRepository
from app.common.domain.repositories.performance_repository import PerformanceRepository


class DashboardService:
    def __init__(
        self,
        dashboard_repo: DashboardRepository,
        *,
        organization_repo: OrganizationRepository | None = None,
        kanban_repo: KanbanBoardRepository | None = None,
        performance: PerformanceRepository | None = None,
    ) -> None:
        self._dashboard_repo = dashboard_repo
        self._organization_repo = organization_repo
        self._kanban_repo = kanban_repo
        self._performance = performance

    def get_overview(self, region_id: str, *, year: str | None = None) -> dict:
        overview = self._dashboard_repo.get_overview(region_id)
        payload = overview_record_to_payload(overview)
        return apply_live_dashboard_metrics(
            payload,
            region_id,
            org_repo=self._organization_repo,
            kanban_repo=self._kanban_repo,
            performance=self._performance,
            year=year or str(datetime.now(UTC).year),
        )
