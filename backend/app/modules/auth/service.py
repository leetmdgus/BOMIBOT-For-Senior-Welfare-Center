import uuid

from app.modules.organization.service import OrganizationService
from app.common.core.security import create_access_token, hash_password, verify_password
from app.common.domain.repositories.auth_repository import AuthRepository, LoginEventRecord, UserRecord


class AuthService:
    def __init__(
        self,
        auth_repo: AuthRepository,
        organization: OrganizationService | None = None,
    ) -> None:
        self._auth_repo = auth_repo
        # 회원가입 시 조직현황(직원)으로도 등록하기 위한 선택적 의존성.
        self._organization = organization

    def _record_login(
        self,
        *,
        user_id: str | None,
        region_id: str,
        email: str,
        provider: str,
        success: bool,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        self._auth_repo.record_login_event(
            LoginEventRecord(
                id=f"login-{uuid.uuid4().hex[:12]}",
                user_id=user_id,
                region_id=region_id,
                email=email.strip().lower(),
                provider=provider,
                success=success,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )

    def _build_session(self, user: UserRecord) -> dict | None:
        region = self._auth_repo.get_region(user.region_id)
        if not region:
            return None
        token = create_access_token(user.id, extra={"region_id": user.region_id})
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role_display,
            "roleType": user.role_type,
            "department": user.department,
            "regionId": user.region_id,
            "profileImage": user.profile_image_url,
            "token": token,
            "regionLabel": region.label,
            "orgName": region.org_name,
            "googleCalendarConnected": bool(user.google_refresh_token),
        }

    def login(
        self,
        email: str,
        password: str,
        region_id: str,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict | None:
        normalized_email = email.strip().lower()
        user = self._auth_repo.find_user_by_email(email, region_id)
        if not user or not verify_password(password, user.password_hash):
            self._record_login(
                user_id=user.id if user else None,
                region_id=region_id,
                email=normalized_email,
                provider="password",
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return None

        self._auth_repo.touch_last_login(user.id)
        self._record_login(
            user_id=user.id,
            region_id=region_id,
            email=normalized_email,
            provider="password",
            success=True,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return self._build_session(user)

    def signup(
        self,
        *,
        email: str,
        password: str,
        name: str,
        department: str,
        region_id: str,
    ) -> dict:
        if self._auth_repo.find_user_by_email(email, region_id):
            raise ValueError("이미 사용 중인 이메일입니다.")

        user_id = f"user-{region_id}-{uuid.uuid4().hex[:8]}"

        # 회원가입과 동시에 조직현황 직원으로 등록하고 user.employee_id 로 연결한다.
        employee_id: str | None = None
        if self._organization is not None:
            employee_id = self._organization.register_self_employee(
                region_id,
                name=name,
                email=email,
                department_name=department,
            )

        record = UserRecord(
            id=user_id,
            region_id=region_id,
            email=email.strip().lower(),
            password_hash=hash_password(password),
            name=name.strip(),
            role_display="사용자",
            role_type="user",
            department=department.strip(),
            employee_id=employee_id,
        )
        created = self._auth_repo.create_user(record)
        self._record_login(
            user_id=created.id,
            region_id=region_id,
            email=created.email,
            provider="password",
            success=True,
        )
        session = self._build_session(created)
        if not session:
            raise ValueError("세션을 생성하지 못했습니다.")
        return session

    def get_session(self, user_id: str) -> dict | None:
        user = self._auth_repo.get_user_by_id(user_id)
        if not user:
            return None
        return self._build_session(user)

    def get_user_by_id(self, user_id: str) -> UserRecord | None:
        return self._auth_repo.get_user_by_id(user_id)

    def change_password(
        self,
        user_id: str,
        *,
        current_password: str,
        new_password: str,
    ) -> None:
        user = self._auth_repo.get_user_by_id(user_id)
        if not user:
            raise LookupError("사용자를 찾을 수 없습니다.")
        if not verify_password(current_password, user.password_hash):
            raise ValueError("현재 비밀번호가 올바르지 않습니다.")
        normalized = new_password.strip()
        if len(normalized) < 6:
            raise ValueError("새 비밀번호는 6자 이상이어야 합니다.")
        if verify_password(normalized, user.password_hash):
            raise ValueError("새 비밀번호는 현재 비밀번호와 달라야 합니다.")
        self._auth_repo.update_password_hash(user_id, hash_password(normalized))
