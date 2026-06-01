import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import Settings, get_settings
from app.core.security import create_access_token, decode_access_token, hash_password
from app.domain.repositories.auth_repository import AuthRepository, LoginEventRecord, UserRecord

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES_LOGIN = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.readonly",
]
SCOPES_CALENDAR = ["https://www.googleapis.com/auth/calendar.readonly"]


class GoogleOAuthService:
    def __init__(self, auth_repo: AuthRepository, settings: Settings | None = None) -> None:
        self._auth_repo = auth_repo
        self._settings = settings or get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(
            self._settings.google_client_id.strip()
            and self._settings.google_client_secret.strip()
        )

    def create_state_token(
        self,
        *,
        region_id: str,
        purpose: str,
        user_id: str | None = None,
    ) -> str:
        expire = datetime.now(UTC) + timedelta(minutes=10)
        payload: dict[str, Any] = {
            "sub": "google_oauth",
            "typ": "google_oauth",
            "region_id": region_id,
            "purpose": purpose,
            "nonce": secrets.token_urlsafe(16),
            "exp": expire,
        }
        if user_id:
            payload["user_id"] = user_id
        from jose import jwt

        return jwt.encode(payload, self._settings.secret_key, algorithm="HS256")

    def decode_state_token(self, state: str) -> dict[str, Any] | None:
        payload = decode_access_token(state)
        if not payload or payload.get("typ") != "google_oauth":
            return None
        return payload

    def build_authorize_url(
        self,
        *,
        region_id: str,
        purpose: str,
        user_id: str | None = None,
    ) -> str:
        if not self.is_configured:
            raise ValueError("Google OAuth가 설정되지 않았습니다.")

        scopes = SCOPES_LOGIN if purpose == "login" else SCOPES_CALENDAR
        state = self.create_state_token(
            region_id=region_id,
            purpose=purpose,
            user_id=user_id,
        )
        params = {
            "client_id": self._settings.google_client_id,
            "redirect_uri": self._settings.google_redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self._settings.google_client_id,
                    "client_secret": self._settings.google_client_secret,
                    "redirect_uri": self._settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()

    async def fetch_userinfo(self, access_token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()

    def record_login(
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

    def _session_payload(self, user: UserRecord) -> dict | None:
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

    async def handle_callback(
        self,
        *,
        code: str,
        state: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[dict | None, str | None]:
        """Returns (session_dict, error_message)."""
        state_payload = self.decode_state_token(state)
        if not state_payload:
            return None, "유효하지 않은 OAuth 상태입니다."

        region_id = str(state_payload.get("region_id", ""))
        purpose = str(state_payload.get("purpose", "login"))
        linked_user_id = state_payload.get("user_id")

        if region_id not in {"chuncheon-north", "chuncheon-east"}:
            return None, "지역 정보가 올바르지 않습니다."

        try:
            token_data = await self.exchange_code(code)
        except httpx.HTTPError:
            self.record_login(
                user_id=str(linked_user_id) if linked_user_id else None,
                region_id=region_id,
                email="",
                provider="google",
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return None, "Google 토큰 교환에 실패했습니다."

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        if not access_token:
            return None, "Google 액세스 토큰을 받지 못했습니다."

        try:
            profile = await self.fetch_userinfo(access_token)
        except httpx.HTTPError:
            return None, "Google 사용자 정보를 가져오지 못했습니다."

        google_sub = str(profile.get("id", ""))
        email = str(profile.get("email", "")).strip().lower()
        name = str(profile.get("name") or profile.get("given_name") or email.split("@")[0])
        picture = profile.get("picture")

        if not google_sub or not email:
            return None, "Google 계정 정보가 부족합니다."

        user: UserRecord | None = None

        if purpose == "calendar" and linked_user_id:
            user = self._auth_repo.get_user_by_id(str(linked_user_id))
            if not user:
                return None, "연동할 사용자를 찾을 수 없습니다."
            if refresh_token:
                self._auth_repo.update_google_account(
                    user.id,
                    google_sub=google_sub,
                    google_refresh_token=refresh_token,
                )
            user = self._auth_repo.get_user_by_id(user.id)
        else:
            user = self._auth_repo.find_user_by_google_sub(google_sub)
            if not user:
                user = self._auth_repo.find_user_by_email(email, region_id)

            if user:
                if refresh_token:
                    self._auth_repo.update_google_account(
                        user.id,
                        google_sub=google_sub,
                        google_refresh_token=refresh_token,
                    )
            else:
                user_id = f"user-{region_id}-google-{uuid.uuid4().hex[:8]}"
                record = UserRecord(
                    id=user_id,
                    region_id=region_id,
                    email=email,
                    password_hash=hash_password(secrets.token_urlsafe(32)),
                    name=name,
                    role_display="사용자",
                    role_type="user",
                    department="미지정",
                    profile_image_url=picture if isinstance(picture, str) else None,
                )
                user = self._auth_repo.create_user(record)
                if refresh_token:
                    self._auth_repo.update_google_account(
                        user.id,
                        google_sub=google_sub,
                        google_refresh_token=refresh_token,
                    )

            user = self._auth_repo.get_user_by_id(user.id)
            if user:
                self._auth_repo.touch_last_login(user.id)

        if not user:
            return None, "사용자 처리에 실패했습니다."

        self.record_login(
            user_id=user.id,
            region_id=region_id,
            email=email,
            provider="google",
            success=True,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        session = self._session_payload(user)
        if not session:
            return None, "세션을 생성하지 못했습니다."
        return session, None

    def get_google_status(self, user_id: str) -> dict:
        user = self._auth_repo.get_user_by_id(user_id)
        if not user:
            return {"connected": False}
        return {
            "connected": bool(user.google_refresh_token),
            "email": user.email,
            "connectedAt": (
                user.google_calendar_connected_at.isoformat()
                if user.google_calendar_connected_at
                else None
            ),
        }

    def frontend_callback_url(self, session: dict) -> str:
        from urllib.parse import quote

        base = self._settings.frontend_url.rstrip("/")
        token = quote(session["token"], safe="")
        region_id = quote(session["regionId"], safe="")
        return f"{base}/auth/google/callback?token={token}&regionId={region_id}"
