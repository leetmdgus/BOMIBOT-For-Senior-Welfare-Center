from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.modules.organization.service import OrganizationService
from app.common.domain.repositories.auth_repository import UserRecord
from app.common.dependencies import (
    get_current_user,
    get_organization_service,
    require_region_id,
)

router = APIRouter(tags=["organization"])


class CreateEmployeeBody(BaseModel):
    name: str
    department_id: str = Field(alias="departmentId")
    email: str
    role: str | None = None
    position: str | None = None
    phone: str | None = None
    join_date: str | None = Field(default=None, alias="joinDate")
    profile_image: str | None = Field(default=None, alias="profileImage")
    is_team_leader: bool | None = Field(default=None, alias="isTeamLeader")
    is_admin: bool | None = Field(default=None, alias="isAdmin")

    model_config = {"populate_by_name": True}


class UpdateEmployeeBody(BaseModel):
    name: str | None = None
    role: str | None = None
    position: str | None = None
    department_id: str | None = Field(default=None, alias="departmentId")
    email: str | None = None
    phone: str | None = None
    join_date: str | None = Field(default=None, alias="joinDate")
    profile_image: str | None = Field(default=None, alias="profileImage")
    is_team_leader: bool | None = Field(default=None, alias="isTeamLeader")
    is_admin: bool | None = Field(default=None, alias="isAdmin")

    model_config = {"populate_by_name": True}


class UpdateDepartmentBody(BaseModel):
    name: str | None = None


@router.get("/employees")
def search_employees(
    region_id: str = Depends(require_region_id),
    search: str | None = Query(default=None),
    department: str | None = Query(default=None),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    return organization_service.search(region_id, search=search, department=department)


@router.get("/employees/context")
def employee_context(
    region_id: str = Depends(require_region_id),
    user: UserRecord = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    return organization_service.get_context(region_id, user)


@router.get("/employees/departments")
def department_options(
    region_id: str = Depends(require_region_id),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    return {"departments": organization_service.list_department_options(region_id)}


@router.get("/public/departments/{region_id}")
def public_department_options(
    region_id: str,
    organization_service: OrganizationService = Depends(get_organization_service),
):
    """회원가입(비로그인)용 부서 목록 — 인증 불필요, 지역은 경로로 받는다."""
    return {"departments": organization_service.list_department_options(region_id)}


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(
    body: CreateEmployeeBody,
    region_id: str = Depends(require_region_id),
    user: UserRecord = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    payload = body.model_dump(by_alias=True, exclude_none=True)
    try:
        return organization_service.create_employee(region_id, user, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/employees/{employee_id}")
def update_employee(
    employee_id: str,
    body: UpdateEmployeeBody,
    region_id: str = Depends(require_region_id),
    user: UserRecord = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    payload = body.model_dump(by_alias=True, exclude_none=True)
    try:
        return organization_service.update_employee(
            region_id, user, employee_id, payload
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: str,
    region_id: str = Depends(require_region_id),
    user: UserRecord = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    try:
        organization_service.delete_employee(region_id, user, employee_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/employees/{employee_id}/profile-image", status_code=status.HTTP_201_CREATED)
async def upload_employee_profile_image(
    employee_id: str,
    file: UploadFile = File(...),
    region_id: str = Depends(require_region_id),
    user: UserRecord = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    try:
        return await organization_service.upload_profile_image(
            region_id, user, employee_id, file
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/employees/profile-content/{storage_key}")
def get_employee_profile_content(
    storage_key: str,
    region_id: str = Depends(require_region_id),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    try:
        path = organization_service.get_profile_image_path(region_id, storage_key)
    except HTTPException as exc:
        raise exc
    media_type = "image/jpeg"
    if storage_key.lower().endswith(".png"):
        media_type = "image/png"
    elif storage_key.lower().endswith(".webp"):
        media_type = "image/webp"
    elif storage_key.lower().endswith(".gif"):
        media_type = "image/gif"
    return FileResponse(path, media_type=media_type)


@router.patch("/departments/{department_id}")
def update_department(
    department_id: str,
    body: UpdateDepartmentBody,
    region_id: str = Depends(require_region_id),
    user: UserRecord = Depends(get_current_user),
    organization_service: OrganizationService = Depends(get_organization_service),
):
    payload = body.model_dump(exclude_none=True)
    try:
        return organization_service.update_department(
            region_id, user, department_id, payload
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
