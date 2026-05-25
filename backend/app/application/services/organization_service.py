import uuid
from pathlib import Path

from fastapi import UploadFile

from app.application.organization_permissions import (
    OrgActor,
    can_assign_team_leader,
    can_create_employee,
    can_create_employee_in_department,
    can_edit_department,
    can_edit_employee,
    can_full_hr_edit,
    filter_self_edit_body,
    is_management,
    is_self_target,
)
from app.application.services.file_storage_service import FileStorageService
from app.domain.repositories.auth_repository import AuthRepository, UserRecord
from app.domain.repositories.organization_repository import (
    DepartmentRecord,
    DepartmentUpdate,
    EmployeeCreate,
    EmployeeRecord,
    EmployeeUpdate,
    OrganizationRepository,
)


def _strip_scoped_id(value: str) -> str:
    if ":" in value:
        return value.split(":", 1)[1]
    return value


PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
PROFILE_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


class OrganizationService:
    def __init__(
        self,
        organization_repo: OrganizationRepository,
        auth_repo: AuthRepository | None = None,
        file_storage: FileStorageService | None = None,
    ) -> None:
        self._organization_repo = organization_repo
        self._auth_repo = auth_repo
        self._file_storage = file_storage or FileStorageService()

    def search(
        self,
        region_id: str,
        *,
        search: str | None = None,
        department: str | None = None,
    ) -> dict:
        scoped_department = (
            f"{region_id}:{department}" if department and department != "all" else department
        )
        result = self._organization_repo.search(
            region_id, search=search, department=scoped_department
        )
        return {
            "departments": [self._department_payload(d) for d in result.departments],
            "positionGroups": [self._department_payload(d) for d in result.position_groups],
            "employees": [self._employee_payload(e) for e in result.employees],
        }

    def get_context(self, region_id: str, user: UserRecord) -> dict:
        actor = self._resolve_actor(region_id, user)
        employee = actor.employee
        return {
            "employeeId": _strip_scoped_id(employee.id) if employee else None,
            "department": employee.department if employee else user.department,
            "permissions": {
                "canEditDepartment": can_edit_department(actor),
                "canAssignTeamLeader": can_assign_team_leader(actor),
                "canCreateEmployee": can_create_employee(actor),
                "isAdmin": actor.is_admin,
                "isTeamLeader": bool(employee and employee.is_team_leader),
                "isManagement": bool(employee and is_management(employee)),
            },
        }

    def create_employee(
        self,
        region_id: str,
        user: UserRecord,
        body: dict,
    ) -> dict:
        actor = self._resolve_actor(region_id, user)
        if not can_create_employee(actor):
            raise PermissionError("직원 추가 권한이 없습니다.")

        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        department_id = (body.get("departmentId") or "").strip()
        if not name or not email or not department_id:
            raise ValueError("이름, 이메일, 부서는 필수입니다.")

        if self._organization_repo.get_employee_by_email(region_id, email):
            raise ValueError("이미 사용 중인 이메일입니다.")

        if not can_create_employee_in_department(actor, department_id):
            raise PermissionError("이 부서에 직원을 추가할 권한이 없습니다.")

        is_team_leader = False
        is_admin = False
        if "isTeamLeader" in body:
            if not can_assign_team_leader(actor):
                raise PermissionError("팀장 지정 권한이 없습니다.")
            is_team_leader = bool(body["isTeamLeader"])
        if "isAdmin" in body:
            if not actor.is_admin:
                raise PermissionError("관리자 지정 권한이 없습니다.")
            is_admin = bool(body["isAdmin"])

        employee_id = f"emp-{uuid.uuid4().hex[:8]}"
        payload = EmployeeCreate(
            name=name,
            department_id=department_id,
            email=email,
            role=(body.get("role") or "").strip(),
            position=(body.get("position") or "").strip(),
            phone=(body.get("phone") or "").strip(),
            join_date=body.get("joinDate"),
            profile_image=body.get("profileImage") or None,
            is_team_leader=is_team_leader,
            is_admin=is_admin,
        )
        try:
            created = self._organization_repo.create_employee(
                region_id, employee_id, payload
            )
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        return self._employee_payload(created)

    def update_employee(
        self,
        region_id: str,
        user: UserRecord,
        employee_id: str,
        body: dict,
    ) -> dict:
        actor = self._resolve_actor(region_id, user)
        scoped_id = f"{region_id}:{employee_id}"
        target = self._organization_repo.get_employee(region_id, employee_id)
        if not target:
            raise LookupError("직원을 찾을 수 없습니다.")

        if not can_edit_employee(actor, target):
            raise PermissionError("수정 권한이 없습니다.")

        if is_self_target(actor, target) and not can_full_hr_edit(actor, target):
            body = filter_self_edit_body(body)
        elif not can_full_hr_edit(actor, target):
            raise PermissionError("수정 권한이 없습니다.")

        patch = EmployeeUpdate(
            name=body.get("name"),
            role=body.get("role"),
            position=body.get("position"),
            department_id=body.get("departmentId"),
            email=body.get("email"),
            phone=body.get("phone"),
            join_date=body.get("joinDate"),
            profile_image=body.get("profileImage"),
        )

        if "isTeamLeader" in body:
            if not can_assign_team_leader(actor):
                raise PermissionError("팀장 지정 권한이 없습니다.")
            patch.is_team_leader = bool(body["isTeamLeader"])

        if "isAdmin" in body:
            if not actor.is_admin:
                raise PermissionError("관리자 지정 권한이 없습니다.")
            patch.is_admin = bool(body["isAdmin"])

        updated = self._organization_repo.update_employee(region_id, employee_id, patch)
        if not updated:
            raise LookupError("직원을 찾을 수 없습니다.")

        if self._auth_repo:
            self._auth_repo.sync_user_profile_from_employee(
                employee_id=scoped_id,
                name=updated.name,
                department=updated.department,
                role_display=updated.role,
                profile_image_url=updated.profile_image,
            )

        return self._employee_payload(updated)

    async def upload_profile_image(
        self,
        region_id: str,
        user: UserRecord,
        employee_id: str,
        upload: UploadFile,
    ) -> dict:
        actor = self._resolve_actor(region_id, user)
        target = self._organization_repo.get_employee(region_id, employee_id)
        if not target:
            raise LookupError("직원을 찾을 수 없습니다.")

        if not can_edit_employee(actor, target):
            raise PermissionError("프로필 사진 수정 권한이 없습니다.")

        filename = (upload.filename or "profile.jpg").strip()
        ext = Path(filename).suffix.lower()
        if ext not in PROFILE_IMAGE_EXTENSIONS:
            raise ValueError("jpg, png, webp, gif 형식만 업로드할 수 있습니다.")

        data = await upload.read()
        if not data:
            raise ValueError("파일이 비어 있습니다.")
        if len(data) > PROFILE_IMAGE_MAX_BYTES:
            raise ValueError("프로필 사진은 5MB 이하만 업로드할 수 있습니다.")

        storage_id = f"profile-{_strip_scoped_id(employee_id)}-{uuid.uuid4().hex[:10]}"
        storage_key, _ = self._file_storage.write(
            region_id, storage_id, filename, data
        )
        profile_url = f"/api/v1/employees/profile-content/{storage_key}"

        updated = self._organization_repo.update_employee(
            region_id,
            employee_id,
            EmployeeUpdate(profile_image=profile_url),
        )
        if not updated:
            raise LookupError("직원을 찾을 수 없습니다.")

        scoped_id = f"{region_id}:{employee_id}"
        if self._auth_repo:
            self._auth_repo.sync_user_profile_from_employee(
                employee_id=scoped_id,
                name=updated.name,
                department=updated.department,
                role_display=updated.role,
                profile_image_url=updated.profile_image,
            )

        return {"profileImage": updated.profile_image}

    def get_profile_image_path(self, region_id: str, storage_key: str) -> Path:
        return self._file_storage.resolve_path(region_id, storage_key)

    def update_department(
        self,
        region_id: str,
        user: UserRecord,
        department_id: str,
        body: dict,
    ) -> dict:
        actor = self._resolve_actor(region_id, user)
        if not can_edit_department(actor):
            raise PermissionError("부서 수정 권한이 없습니다.")

        updated = self._organization_repo.update_department(
            region_id,
            department_id,
            DepartmentUpdate(name=body.get("name")),
        )
        if not updated:
            raise LookupError("부서를 찾을 수 없습니다.")

        return {
            "id": _strip_scoped_id(updated.id),
            "name": updated.name,
            "count": updated.count,
        }

    def list_department_options(self, region_id: str) -> list[dict]:
        departments = self._organization_repo.list_departments(region_id)
        return [
            {
                "id": _strip_scoped_id(dept.id),
                "name": dept.name,
            }
            for dept in departments
        ]

    def _resolve_actor(self, region_id: str, user: UserRecord) -> OrgActor:
        employee: EmployeeRecord | None = None
        if user.employee_id:
            raw_id = _strip_scoped_id(user.employee_id)
            employee = self._organization_repo.get_employee(region_id, raw_id)
        if not employee:
            employee = self._organization_repo.get_employee_by_email(region_id, user.email)
        return OrgActor(
            user_id=user.id,
            region_id=region_id,
            role_type=user.role_type,
            role_display=user.role_display,
            employee=employee,
        )

    def _department_payload(self, dept: DepartmentRecord) -> dict:
        return {
            "id": _strip_scoped_id(dept.id),
            "name": dept.name,
            "count": dept.count,
            "employees": [self._employee_payload(e) for e in dept.employees],
        }

    @staticmethod
    def _employee_payload(emp: EmployeeRecord) -> dict:
        return {
            "id": _strip_scoped_id(emp.id),
            "name": emp.name,
            "role": emp.role,
            "position": emp.position,
            "department": emp.department,
            "departmentId": _strip_scoped_id(emp.department_id) if emp.department_id else "",
            "email": emp.email,
            "phone": emp.phone,
            "joinDate": emp.join_date,
            "tenure": emp.tenure,
            "lastLogin": emp.last_login,
            "isAdmin": emp.is_admin,
            "isTeamLeader": emp.is_team_leader,
            "profileImage": emp.profile_image,
        }
