<<<<<<< HEAD
from app.domain.repositories.dashboard_repository import DashboardRepository


class DashboardService:
    def __init__(self, dashboard_repo: DashboardRepository) -> None:
        self._dashboard_repo = dashboard_repo

    def get_overview(self, region_id: str) -> dict:
        overview = self._dashboard_repo.get_overview(region_id)
        return {
            "stats": [
                {
                    "label": s.label,
                    "labelEn": s.label_en,
                    "value": s.value,
                    "unit": s.unit,
                    "description": s.description,
                    "iconName": s.icon_name,
                    "color": s.color,
                    "link": s.link,
                    "showChart": s.show_chart,
                    "goto": s.goto,
                }
                for s in overview.stats
            ],
            "progress": [
                {
                    "label": p.label,
                    "value": p.value,
                    "iconName": p.icon_name,
                    "color": p.color,
                    "textColor": p.text_color,
                }
                for p in overview.progress
            ],
            "calendarEvents": [
                {
                    "day": c.day,
                    "title": c.title,
                    "color": c.color,
                    "category": c.category,
                }
                for c in overview.calendar_events
            ],
            "volunteerEvents": [
                {
                    "id": v.id.split(":", 1)[-1] if ":" in v.id else v.id,
                    "name": v.name,
                    "program": v.program,
                    "day": v.day,
                    "status": v.status,
                }
                for v in overview.volunteer_events
            ],
        }
=======
"""하위 호환 — `app.application.dashboard.service.DashboardService` 사용 권장."""

from app.application.dashboard.service import DashboardService

__all__ = ["DashboardService"]
>>>>>>> dev2
