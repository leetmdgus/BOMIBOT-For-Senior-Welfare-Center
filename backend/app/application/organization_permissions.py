"""조직현황 수정 권한 — 본인 / 팀장 / 관리직 / admin."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.repositories.organization_repository import EmployeeRecord

MANAGEMENT_KEYWORDS = ("관장", "부장", "실장", "차장", "과장", "팀장", "총괄", "관리자")


@dataclass(frozen=True)
class OrgActor:
    user_id: str
    region_id: str
    role_type: str
    role_display: str
    employee: EmployeeRecord | None

    @property
    def is_app_admin(self) -> bool:
        return self.role_type == "admin"

    @property
    def is_employee_admin(self) -> bool:
        return bool(self.employee and self.employee.is_admin)

    @property
    def is_admin(self) -> bool:
        return self.is_app_admin or self.is_employee_admin


def is_management(employee: EmployeeRecord) -> bool:
    text = f"{employee.role} {employee.position}"
    return any(keyword in text for keyword in MANAGEMENT_KEYWORDS)


def is_self_target(actor: OrgActor, target: EmployeeRecord) -> bool:
    return bool(actor.employee and actor.employee.id == target.id)


def can_edit_employee(actor: OrgActor, target: EmployeeRecord) -> bool:
    if actor.is_admin:
        return True
    if is_self_target(actor, target):
        return True
    if actor.employee and is_management(actor.employee):
        return True
    if actor.employee and actor.employee.is_team_leader:
        return actor.employee.department == target.department
    return False


def can_full_hr_edit(actor: OrgActor, target: EmployeeRecord) -> bool:
    """조직·직책 등 HR 필드 수정 (본인은 제한)."""
    if not can_edit_employee(actor, target):
        return False
    if actor.is_admin:
        return True
    if is_self_target(actor, target):
        return False
    if actor.employee and is_management(actor.employee):
        return True
    if actor.employee and actor.employee.is_team_leader:
        return actor.employee.department == target.department
    return False


SELF_EDIT_BODY_KEYS = frozenset(
    {"name", "email", "phone", "profileImage", "profile_image"}
)


def filter_self_edit_body(body: dict) -> dict:
    return {key: value for key, value in body.items() if key in SELF_EDIT_BODY_KEYS}


def can_edit_department(actor: OrgActor) -> bool:
    return actor.is_admin or (
        actor.employee is not None and is_management(actor.employee)
    )


def can_assign_team_leader(actor: OrgActor) -> bool:
    return actor.is_admin


def can_create_employee(actor: OrgActor) -> bool:
    if actor.is_admin:
        return True
    if "관리자" in (actor.role_display or ""):
        return True
    if actor.employee and is_management(actor.employee):
        return True
    if actor.employee and actor.employee.is_team_leader:
        return True
    return False


def can_create_employee_in_department(actor: OrgActor, department_id: str) -> bool:
    """팀장은 소속 부서에만 직원 추가 가능."""
    if not can_create_employee(actor):
        return False
    if actor.is_admin or (actor.employee and is_management(actor.employee)):
        return True
    if "관리자" in (actor.role_display or ""):
        return True
    if actor.employee and actor.employee.is_team_leader:
        scoped = department_id.split(":", 1)[-1] if ":" in department_id else department_id
        actor_dept = actor.employee.department_id.split(":", 1)[-1]
        return scoped == actor_dept
    return True
