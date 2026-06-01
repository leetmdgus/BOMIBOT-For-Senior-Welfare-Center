from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RegionModel(Base):
    __tablename__ = "regions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    short_label: Mapped[str] = mapped_column(String(32), nullable=False)
    org_name: Mapped[str] = mapped_column(String(256), nullable=False)

    users: Mapped[list["UserModel"]] = relationship(back_populates="region")


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role_display: Mapped[str] = mapped_column(String(64), nullable=False)
    role_type: Mapped[str] = mapped_column(String(16), nullable=False)
    department: Mapped[str] = mapped_column(String(128), nullable=False)
    employee_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("employees.id"), index=True, nullable=True
    )
    profile_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    google_sub: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    google_refresh_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    google_calendar_connected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    region: Mapped[RegionModel] = relationship(back_populates="users")
