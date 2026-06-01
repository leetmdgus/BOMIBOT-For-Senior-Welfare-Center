from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DashboardStatModel(Base):
    __tablename__ = "dashboard_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    label_en: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(String(32), nullable=False)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    icon_name: Mapped[str] = mapped_column(String(32), nullable=False)
    color: Mapped[str] = mapped_column(String(64), nullable=False)
    link: Mapped[str | None] = mapped_column(String(256), nullable=True)
    show_chart: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    goto: Mapped[str | None] = mapped_column(String(256), nullable=True)


class DashboardProgressModel(Base):
    __tablename__ = "dashboard_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    icon_name: Mapped[str] = mapped_column(String(32), nullable=False)
    color: Mapped[str] = mapped_column(String(64), nullable=False)
    text_color: Mapped[str] = mapped_column(String(64), nullable=False)


class CalendarEventModel(Base):
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    calendar_month: Mapped[str] = mapped_column(String(7), default="2026-05", nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    color: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False)


class VolunteerEventModel(Base):
    __tablename__ = "volunteer_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    program: Mapped[str] = mapped_column(String(256), nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
