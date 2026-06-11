from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class StatCardRecord:
    label: str
    label_en: str
    value: str
    unit: str
    description: str
    icon_name: str
    color: str
    link: str | None = None
    show_chart: bool = False
    goto: str | None = None


@dataclass
class ProgressCardRecord:
    label: str
    value: int
    icon_name: str
    color: str
    text_color: str


@dataclass
class CalendarEventRecord:
    day: int
    title: str
    color: str
    category: str


@dataclass
class VolunteerEventRecord:
    id: str
    name: str
    program: str
    day: int
    status: str


@dataclass
class DashboardOverviewRecord:
    stats: list[StatCardRecord]
    progress: list[ProgressCardRecord]
    calendar_events: list[CalendarEventRecord]
    volunteer_events: list[VolunteerEventRecord]


class DashboardRepository(ABC):
    @abstractmethod
    def get_overview(self, region_id: str) -> DashboardOverviewRecord: ...
