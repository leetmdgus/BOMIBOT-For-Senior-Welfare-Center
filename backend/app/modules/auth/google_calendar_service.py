from calendar import monthrange
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.common.core.config import get_settings
from app.common.domain.repositories.auth_repository import AuthRepository, UserRecord

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

KST = timezone(timedelta(hours=9))
GOOGLE_EVENT_COLOR = "bg-sky-500"


class GoogleCalendarService:
    def __init__(self, auth_repo: AuthRepository) -> None:
        self._auth_repo = auth_repo
        self._settings = get_settings()

    async def _refresh_access_token(self, refresh_token: str) -> str:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self._settings.google_client_id,
                    "client_secret": self._settings.google_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            data = response.json()
            access = data.get("access_token")
            if not access:
                raise ValueError("access_token missing")
            return str(access)

    async def list_month_events(
        self,
        user: UserRecord,
        *,
        year: int,
        month: int,
    ) -> list[dict[str, Any]]:
        if not user.google_refresh_token:
            return []

        access_token = await self._refresh_access_token(user.google_refresh_token)
        _, last_day = monthrange(year, month)
        time_min = datetime(year, month, 1, 0, 0, 0, tzinfo=KST).isoformat()
        time_max = datetime(year, month, last_day, 23, 59, 59, tzinfo=KST).isoformat()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                GOOGLE_EVENTS_URL,
                params={
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 250,
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            payload = response.json()

        events: list[dict[str, Any]] = []
        for item in payload.get("items", []):
            start = item.get("start", {})
            raw = start.get("dateTime") or start.get("date")
            if not raw:
                continue
            try:
                if "T" in raw:
                    dt = datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(KST)
                    day = dt.day
                else:
                    day = int(raw.split("-")[2])
            except (ValueError, IndexError):
                continue

            title = str(item.get("summary") or "(제목 없음)")
            events.append(
                {
                    "day": day,
                    "title": title,
                    "color": GOOGLE_EVENT_COLOR,
                    "category": "google",
                    "source": "google",
                    "htmlLink": item.get("htmlLink"),
                }
            )
        return events
