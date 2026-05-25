from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.repositories.auth_repository import (
    AuthRepository,
    LoginEventRecord,
    RegionRecord,
    UserRecord,
)
from app.infrastructure.persistence.models.auth import RegionModel, UserModel
from app.infrastructure.persistence.models.login_event import LoginEventModel


class SqlAlchemyAuthRepository(AuthRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_region(self, region_id: str) -> RegionRecord | None:
        row = self._session.get(RegionModel, region_id)
        if not row:
            return None
        return RegionRecord(
            id=row.id,
            label=row.label,
            short_label=row.short_label,
            org_name=row.org_name,
        )

    def list_regions(self) -> list[RegionRecord]:
        rows = self._session.scalars(select(RegionModel).order_by(RegionModel.id)).all()
        return [
            RegionRecord(id=r.id, label=r.label, short_label=r.short_label, org_name=r.org_name)
            for r in rows
        ]

    def find_user_by_google_sub(self, google_sub: str) -> UserRecord | None:
        row = self._session.scalar(select(UserModel).where(UserModel.google_sub == google_sub))
        return self._to_record(row) if row else None

    def find_user_by_email(self, email: str, region_id: str) -> UserRecord | None:
        normalized = email.strip().lower()
        row = self._session.scalar(
            select(UserModel).where(
                UserModel.region_id == region_id,
                UserModel.email == normalized,
            )
        )
        return self._to_record(row) if row else None

    def get_user_by_id(self, user_id: str) -> UserRecord | None:
        row = self._session.get(UserModel, user_id)
        return self._to_record(row) if row else None

    def create_user(self, user: UserRecord) -> UserRecord:
        model = UserModel(
            id=user.id,
            region_id=user.region_id,
            email=user.email.strip().lower(),
            password_hash=user.password_hash,
            name=user.name,
            role_display=user.role_display,
            role_type=user.role_type,
            department=user.department,
            employee_id=user.employee_id,
            profile_image_url=user.profile_image_url,
        )
        self._session.add(model)
        self._session.flush()
        return self._to_record(model)

    def touch_last_login(self, user_id: str) -> None:
        row = self._session.get(UserModel, user_id)
        if row:
            row.last_login_at = datetime.now(UTC)
            self._session.flush()

    def update_google_account(
        self,
        user_id: str,
        *,
        google_sub: str,
        google_refresh_token: str,
    ) -> None:
        row = self._session.get(UserModel, user_id)
        if not row:
            return
        row.google_sub = google_sub
        row.google_refresh_token = google_refresh_token
        row.google_calendar_connected_at = datetime.now(UTC)
        self._session.flush()

    def record_login_event(self, event: LoginEventRecord) -> None:
        self._session.add(
            LoginEventModel(
                id=event.id,
                user_id=event.user_id,
                region_id=event.region_id,
                email=event.email,
                provider=event.provider,
                success=event.success,
                ip_address=event.ip_address,
                user_agent=event.user_agent,
            )
        )
        self._session.flush()

    def sync_user_profile_from_employee(
        self,
        *,
        employee_id: str,
        name: str | None = None,
        department: str | None = None,
        role_display: str | None = None,
        profile_image_url: str | None = None,
    ) -> None:
        row = self._session.scalar(
            select(UserModel).where(UserModel.employee_id == employee_id)
        )
        if not row:
            return
        if name is not None:
            row.name = name
        if department is not None:
            row.department = department
        if role_display is not None:
            row.role_display = role_display
        if profile_image_url is not None:
            row.profile_image_url = profile_image_url
        self._session.flush()

    @staticmethod
    def _to_record(row: UserModel) -> UserRecord:
        return UserRecord(
            id=row.id,
            region_id=row.region_id,
            email=row.email,
            password_hash=row.password_hash,
            name=row.name,
            role_display=row.role_display,
            role_type=row.role_type,
            department=row.department,
            employee_id=row.employee_id,
            profile_image_url=row.profile_image_url,
            google_sub=row.google_sub,
            google_refresh_token=row.google_refresh_token,
            google_calendar_connected_at=row.google_calendar_connected_at,
            last_login_at=row.last_login_at,
        )
