from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.modules.auth.google_calendar_service import GoogleCalendarService
from app.modules.auth.google_oauth_service import GoogleOAuthService
from app.common.core.database import get_db
from app.common.domain.repositories.auth_repository import UserRecord
from app.modules.auth.repository import (
    SqlAlchemyAuthRepository,
)
from app.common.dependencies import get_current_user, require_user_id

router = APIRouter(prefix="/auth/google", tags=["auth-google"])


def get_google_oauth_service(db: Session = Depends(get_db)) -> GoogleOAuthService:
    return GoogleOAuthService(SqlAlchemyAuthRepository(db))


def get_google_calendar_service(db: Session = Depends(get_db)) -> GoogleCalendarService:
    return GoogleCalendarService(SqlAlchemyAuthRepository(db))


@router.get("/calendar/connect-url")
def google_calendar_connect_url(
    user_id: str = Depends(require_user_id),
    google: GoogleOAuthService = Depends(get_google_oauth_service),
    db: Session = Depends(get_db),
):
    if not google.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth가 설정되지 않았습니다.",
        )
    user = SqlAlchemyAuthRepository(db).get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    url = google.build_authorize_url(
        region_id=user.region_id,
        purpose="calendar",
        user_id=user.id,
    )
    return {"authorizeUrl": url}


@router.get("/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    google: GoogleOAuthService = Depends(get_google_oauth_service),
):
    settings_frontend = google._settings.frontend_url.rstrip("/")
    if error or not code or not state:
        return RedirectResponse(
            f"{settings_frontend}/auth/google/callback?error=google_auth_cancelled"
        )

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    session, err = await google.handle_callback(
        code=code,
        state=state,
        ip_address=ip,
        user_agent=user_agent,
    )
    if err or not session:
        from urllib.parse import quote

        message = quote(err or "google_auth_failed", safe="")
        return RedirectResponse(f"{settings_frontend}/auth/google/callback?error={message}")

    return RedirectResponse(google.frontend_callback_url(session))


@router.get("/status")
def google_status(
    user_id: str = Depends(require_user_id),
    google: GoogleOAuthService = Depends(get_google_oauth_service),
):
    return google.get_google_status(user_id)


@router.get("/calendar/events")
async def google_calendar_events(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    user: UserRecord = Depends(get_current_user),
    calendar: GoogleCalendarService = Depends(get_google_calendar_service),
):
    if not user.google_refresh_token:
        return {"events": [], "connected": False}
    try:
        events = await calendar.list_month_events(user, year=year, month=month)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Calendar 조회 실패: {exc}",
        ) from exc
    return {"events": events, "connected": True}
