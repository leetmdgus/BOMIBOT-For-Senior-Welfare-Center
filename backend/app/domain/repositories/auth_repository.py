from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RegionRecord:
    id: str
    label: str
    short_label: str
    org_name: str


@dataclass
class UserRecord:
    id: str
    region_id: str
    email: str
    password_hash: str
    name: str
    role_display: str
    role_type: str
    department: str
    employee_id: str | None = None
    profile_image_url: str | None = None
    google_sub: str | None = None
    google_refresh_token: str | None = None
    google_calendar_connected_at: datetime | None = None
    last_login_at: datetime | None = None


@dataclass
class LoginEventRecord:
    id: str
    user_id: str | None
    region_id: str
    email: str
    provider: str
    success: bool
    ip_address: str | None = None
    user_agent: str | None = None


class AuthRepository(ABC):
    @abstractmethod
    def get_region(self, region_id: str) -> RegionRecord | None: ...

    @abstractmethod
    def list_regions(self) -> list[RegionRecord]: ...

    @abstractmethod
    def find_user_by_email(self, email: str, region_id: str) -> UserRecord | None: ...

    @abstractmethod
    def find_user_by_google_sub(self, google_sub: str) -> UserRecord | None: ...

    @abstractmethod
    def get_user_by_id(self, user_id: str) -> UserRecord | None: ...

    @abstractmethod
    def create_user(self, user: UserRecord) -> UserRecord: ...

    @abstractmethod
    def touch_last_login(self, user_id: str) -> None: ...

    @abstractmethod
    def update_google_account(
        self,
        user_id: str,
        *,
        google_sub: str,
        google_refresh_token: str,
    ) -> None: ...

    @abstractmethod
    def record_login_event(self, event: LoginEventRecord) -> None: ...

    @abstractmethod
    def sync_user_profile_from_employee(
        self,
        *,
        employee_id: str,
        name: str | None = None,
        department: str | None = None,
        role_display: str | None = None,
        profile_image_url: str | None = None,
    ) -> None: ...
