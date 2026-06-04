from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.domain.repositories.organization_repository import (
    DepartmentRecord,
    DepartmentUpdate,
    EmployeeCreate,
    EmployeeRecord,
    EmployeeUpdate,
    OrganizationRepository,
    OrganizationSearchRecord,
)
from app.infrastructure.persistence.models.organization import DepartmentModel, EmployeeModel


class SqlAlchemyOrganizationRepository(OrganizationRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def search(
        self,
        region_id: str,
        *,
        search: str | None = None,
        department: str | None = None,
    ) -> OrganizationSearchRecord:
        departments = self._session.scalars(
            select(DepartmentModel)
            .where(DepartmentModel.region_id == region_id)
            .options(joinedload(DepartmentModel.employees))
            .order_by(DepartmentModel.sort_order)
        ).unique().all()

        all_employees: list[EmployeeRecord] = []
        dept_records: list[DepartmentRecord] = []

        for dept in departments:
            employees = [self._employee_record(emp) for emp in dept.employees]
            all_employees.extend(employees)
            dept_records.append(
                DepartmentRecord(
                    id=dept.id,
                    name=dept.name,
                    count=dept.employee_count,
                    employees=employees,
                )
            )

        filtered = all_employees
        if department and department != "all":
            filtered = [e for e in filtered if e.department == department or self._match_dept_id(dept_records, department, e)]
        if search:
            q = search.strip().lower()
            filtered = [
                e
                for e in filtered
                if q in e.name.lower()
                or q in e.email.lower()
                or q in e.department.lower()
                or q in e.position.lower()
            ]

        position_groups = self._group_by_position(filtered)

        return OrganizationSearchRecord(
            departments=dept_records,
            position_groups=position_groups,
            employees=filtered,
        )

    def get_employee(self, region_id: str, employee_id: str) -> EmployeeRecord | None:
        scoped_id = self._scoped_id(region_id, employee_id)
        row = self._session.get(EmployeeModel, scoped_id)
        return self._employee_record(row) if row and row.region_id == region_id else None

    def get_employee_by_email(self, region_id: str, email: str) -> EmployeeRecord | None:
        normalized = email.strip().lower()
        row = self._session.scalar(
            select(EmployeeModel).where(
                EmployeeModel.region_id == region_id,
                func.lower(EmployeeModel.email) == normalized,
            )
        )
        return self._employee_record(row) if row else None

    def get_department(self, region_id: str, department_id: str) -> DepartmentRecord | None:
        scoped_id = self._scoped_id(region_id, department_id)
        row = self._session.get(DepartmentModel, scoped_id)
        if not row or row.region_id != region_id or row.is_aggregate:
            return None
        return DepartmentRecord(
            id=row.id,
            name=row.name,
            count=row.employee_count,
            employees=[],
        )

    def list_departments(self, region_id: str) -> list[DepartmentRecord]:
        rows = self._session.scalars(
            select(DepartmentModel)
            .where(
                DepartmentModel.region_id == region_id,
                DepartmentModel.is_aggregate.is_(False),
            )
            .order_by(DepartmentModel.sort_order)
        ).all()
        return [
            DepartmentRecord(id=row.id, name=row.name, count=row.employee_count, employees=[])
            for row in rows
        ]

    def ensure_department(self, region_id: str, name: str) -> DepartmentRecord:
        clean = (name or "").strip() or "기타"
        existing = self._session.scalars(
            select(DepartmentModel).where(
                DepartmentModel.region_id == region_id,
                DepartmentModel.name == clean,
                DepartmentModel.is_aggregate.is_(False),
            )
        ).first()
        if existing:
            return DepartmentRecord(
                id=existing.id,
                name=existing.name,
                count=existing.employee_count,
                employees=[],
            )
        max_order = self._session.scalar(
            select(func.max(DepartmentModel.sort_order)).where(
                DepartmentModel.region_id == region_id
            )
        )
        row = DepartmentModel(
            id=self._scoped_id(region_id, clean),
            region_id=region_id,
            name=clean,
            employee_count=0,
            sort_order=(max_order or 0) + 1,
            is_aggregate=False,
        )
        self._session.add(row)
        self._session.flush()
        return DepartmentRecord(id=row.id, name=row.name, count=0, employees=[])

    def create_employee(
        self, region_id: str, employee_id: str, payload: EmployeeCreate
    ) -> EmployeeRecord:
        dept_scoped = self._scoped_id(region_id, payload.department_id)
        dept = self._session.get(DepartmentModel, dept_scoped)
        if not dept or dept.region_id != region_id or dept.is_aggregate:
            raise ValueError("Invalid department")

        join_date = (
            date.fromisoformat(payload.join_date) if payload.join_date else None
        )
        row = EmployeeModel(
            id=self._scoped_id(region_id, employee_id),
            region_id=region_id,
            department_id=dept.id,
            name=payload.name.strip(),
            role=(payload.role or payload.position or "직원").strip(),
            position=(payload.position or payload.role or "직원").strip(),
            department_name=dept.name,
            email=payload.email.strip().lower(),
            phone=payload.phone.strip(),
            join_date=join_date,
            tenure=self._compute_tenure(join_date),
            last_login="-",
            is_admin=payload.is_admin,
            is_team_leader=payload.is_team_leader,
            profile_image_url=payload.profile_image or None,
        )
        self._session.add(row)
        self._session.flush()
        self._refresh_department_counts(region_id)
        return self._employee_record(row)

    def update_employee(
        self, region_id: str, employee_id: str, patch: EmployeeUpdate
    ) -> EmployeeRecord | None:
        scoped_id = self._scoped_id(region_id, employee_id)
        row = self._session.get(EmployeeModel, scoped_id)
        if not row or row.region_id != region_id:
            return None

        if patch.name is not None:
            row.name = patch.name.strip()
        if patch.role is not None:
            row.role = patch.role.strip()
        if patch.position is not None:
            row.position = patch.position.strip()
        if patch.email is not None:
            row.email = patch.email.strip().lower()
        if patch.phone is not None:
            row.phone = patch.phone.strip()
        if patch.join_date is not None:
            row.join_date = date.fromisoformat(patch.join_date) if patch.join_date else None
        if patch.profile_image is not None:
            row.profile_image_url = patch.profile_image or None
        if patch.is_team_leader is not None:
            row.is_team_leader = patch.is_team_leader
        if patch.is_admin is not None:
            row.is_admin = patch.is_admin

        if patch.department_id is not None:
            dept_scoped = self._scoped_id(region_id, patch.department_id)
            dept = self._session.get(DepartmentModel, dept_scoped)
            if dept and dept.region_id == region_id and not dept.is_aggregate:
                row.department_id = dept.id
                row.department_name = dept.name

        self._session.flush()
        self._refresh_department_counts(region_id)
        return self._employee_record(row)

    def delete_employee(self, region_id: str, employee_id: str) -> bool:
        scoped_id = self._scoped_id(region_id, employee_id)
        row = self._session.get(EmployeeModel, scoped_id)
        if not row or row.region_id != region_id:
            return False
        self._session.delete(row)
        self._session.flush()
        self._refresh_department_counts(region_id)
        return True

    def update_department(
        self, region_id: str, department_id: str, patch: DepartmentUpdate
    ) -> DepartmentRecord | None:
        scoped_id = self._scoped_id(region_id, department_id)
        row = self._session.get(DepartmentModel, scoped_id)
        if not row or row.region_id != region_id or row.is_aggregate:
            return None

        if patch.name is not None:
            new_name = patch.name.strip()
            row.name = new_name
            employees = self._session.scalars(
                select(EmployeeModel).where(EmployeeModel.department_id == scoped_id)
            ).all()
            for emp in employees:
                emp.department_name = new_name

        self._session.flush()
        return DepartmentRecord(
            id=row.id,
            name=row.name,
            count=row.employee_count,
            employees=[],
        )

    def _refresh_department_counts(self, region_id: str) -> None:
        departments = self._session.scalars(
            select(DepartmentModel).where(DepartmentModel.region_id == region_id)
        ).all()
        for dept in departments:
            if dept.is_aggregate:
                total = self._session.scalar(
                    select(func.count())
                    .select_from(EmployeeModel)
                    .where(EmployeeModel.region_id == region_id)
                )
                dept.employee_count = int(total or 0)
            else:
                count = self._session.scalar(
                    select(func.count())
                    .select_from(EmployeeModel)
                    .where(EmployeeModel.department_id == dept.id)
                )
                dept.employee_count = int(count or 0)

    @staticmethod
    def _compute_tenure(join_date: date | None) -> str:
        if not join_date:
            return ""
        today = date.today()
        months = (today.year - join_date.year) * 12 + (today.month - join_date.month)
        if today.day < join_date.day:
            months -= 1
        years, rem = divmod(max(months, 0), 12)
        if years and rem:
            return f"{years}년 {rem}개월"
        if years:
            return f"{years}년"
        return f"{rem}개월"

    @staticmethod
    def _scoped_id(region_id: str, raw_id: str) -> str:
        if ":" in raw_id:
            return raw_id
        return f"{region_id}:{raw_id}"

    @staticmethod
    def _match_dept_id(
        departments: list[DepartmentRecord], department_id: str, employee: EmployeeRecord
    ) -> bool:
        dept = next((d for d in departments if d.id == department_id), None)
        return bool(dept and dept.name == employee.department)

    @staticmethod
    def _employee_record(emp: EmployeeModel) -> EmployeeRecord:
        return EmployeeRecord(
            id=emp.id,
            name=emp.name,
            role=emp.role,
            position=emp.position,
            department=emp.department_name,
            email=emp.email,
            phone=emp.phone,
            join_date=emp.join_date.isoformat() if emp.join_date else "",
            tenure=emp.tenure,
            last_login=emp.last_login,
            is_admin=emp.is_admin,
            is_team_leader=emp.is_team_leader,
            department_id=emp.department_id,
            profile_image=emp.profile_image_url,
        )

    @staticmethod
    def _group_by_position(employees: list[EmployeeRecord]) -> list[DepartmentRecord]:
        buckets: dict[str, list[EmployeeRecord]] = {}
        for emp in employees:
            buckets.setdefault(emp.position, []).append(emp)
        return [
            DepartmentRecord(
                id=f"pos-{position}",
                name=position,
                count=len(members),
                employees=members,
            )
            for position, members in sorted(buckets.items(), key=lambda item: item[0])
        ]
