from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.repositories.dashboard_repository import (
    CalendarEventRecord,
    DashboardOverviewRecord,
    DashboardRepository,
    ProgressCardRecord,
    StatCardRecord,
    VolunteerEventRecord,
)
from app.infrastructure.persistence.models.dashboard import (
    CalendarEventModel,
    DashboardProgressModel,
    DashboardStatModel,
    VolunteerEventModel,
)


class SqlAlchemyDashboardRepository(DashboardRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_overview(self, region_id: str) -> DashboardOverviewRecord:
        stats = self._session.scalars(
            select(DashboardStatModel)
            .where(DashboardStatModel.region_id == region_id)
            .order_by(DashboardStatModel.sort_order)
        ).all()
        progress = self._session.scalars(
            select(DashboardProgressModel)
            .where(DashboardProgressModel.region_id == region_id)
            .order_by(DashboardProgressModel.sort_order)
        ).all()
        calendar = self._session.scalars(
            select(CalendarEventModel).where(CalendarEventModel.region_id == region_id)
        ).all()
        volunteers = self._session.scalars(
            select(VolunteerEventModel).where(VolunteerEventModel.region_id == region_id)
        ).all()

        return DashboardOverviewRecord(
            stats=[
                StatCardRecord(
                    label=s.label,
                    label_en=s.label_en,
                    value=s.value,
                    unit=s.unit,
                    description=s.description,
                    icon_name=s.icon_name,
                    color=s.color,
                    link=s.link,
                    show_chart=s.show_chart,
                    goto=s.goto,
                )
                for s in stats
            ],
            progress=[
                ProgressCardRecord(
                    label=p.label,
                    value=p.value,
                    icon_name=p.icon_name,
                    color=p.color,
                    text_color=p.text_color,
                )
                for p in progress
            ],
            calendar_events=[
                CalendarEventRecord(
                    day=c.day, title=c.title, color=c.color, category=c.category
                )
                for c in calendar
            ],
            volunteer_events=[
                VolunteerEventRecord(
                    id=v.id,
                    name=v.name,
                    program=v.program,
                    day=v.day,
                    status=v.status,
                )
                for v in volunteers
            ],
        )
