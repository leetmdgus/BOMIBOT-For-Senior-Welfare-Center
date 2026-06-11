from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.core.database import Base


class DepartmentModel(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    employee_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_aggregate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    employees: Mapped[list["EmployeeModel"]] = relationship(back_populates="department")


class EmployeeModel(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    department_id: Mapped[str] = mapped_column(
        ForeignKey("departments.id"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(64), nullable=False)
    position: Mapped[str] = mapped_column(String(64), nullable=False)
    department_name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    join_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tenure: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    last_login: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_team_leader: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    profile_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    department: Mapped[DepartmentModel] = relationship(back_populates="employees")
