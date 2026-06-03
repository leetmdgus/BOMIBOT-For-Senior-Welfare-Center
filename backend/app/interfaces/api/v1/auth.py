from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.application.services.auth_service import AuthService
from app.interfaces.api.deps import get_auth_service, require_user_id
from app.interfaces.api.v1.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    SignupRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(
    body: LoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    if not body.email or not body.password or not body.regionId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이메일, 비밀번호, 지역을 입력해 주세요.",
        )
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    session = auth_service.login(
        body.email,
        body.password,
        body.regionId,
        ip_address=ip,
        user_agent=user_agent,
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일, 비밀번호 또는 지역이 올바르지 않습니다.",
        )
    return session


@router.post("/signup")
def signup(body: SignupRequest, auth_service: AuthService = Depends(get_auth_service)):
    try:
        return auth_service.signup(
            email=body.email,
            password=body.password,
            name=body.name,
            department=body.department,
            region_id=body.regionId,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/session")
def session(
    user_id: str = Depends(require_user_id),
    auth_service: AuthService = Depends(get_auth_service),
):
    session_data = auth_service.get_session(user_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return session_data


@router.post("/logout")
def logout():
    return {"ok": True}


@router.patch("/password")
def change_password(
    body: ChangePasswordRequest,
    user_id: str = Depends(require_user_id),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        auth_service.change_password(
            user_id,
            current_password=body.currentPassword,
            new_password=body.newPassword,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"ok": True}
