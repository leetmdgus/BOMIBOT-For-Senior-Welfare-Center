from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class EmployeeRecord:
    id: str
    name: str
    role: str
    position: str
    department: str
    email: str
    phone: str
    join_date: str
    tenure: str
    last_login: str
    is_admin: bool = False
    is_team_leader: bool = False
    department_id: str = ""
    profile_image: str | None = None


@dataclass
class DepartmentRecord:
    id: str
    name: str
    count: int
    employees: list[EmployeeRecord]


@dataclass
class OrganizationSearchRecord:
    departments: list[DepartmentRecord]
    position_groups: list[DepartmentRecord]
    employees: list[EmployeeRecord]


@dataclass
class DepartmentUpdate:
    name: str | None = None


@dataclass
class EmployeeCreate:
    name: str
    department_id: str
    email: str
    role: str = ""
    position: str = ""
    phone: str = ""
    join_date: str | None = None
    profile_image: str | None = None
    is_team_leader: bool = False
    is_admin: bool = False


@dataclass
class EmployeeUpdate:
    name: str | None = None
    role: str | None = None
    position: str | None = None
    department_id: str | None = None
    email: str | None = None
    phone: str | None = None
    join_date: str | None = None
    profile_image: str | None = None
    is_team_leader: bool | None = None
    is_admin: bool | None = None


class OrganizationRepository(ABC):
    @abstractmethod
    def search(
        self,
        region_id: str,
        *,
        search: str | None = None,
        department: str | None = None,
    ) -> OrganizationSearchRecord: ...

    @abstractmethod
    def get_employee(self, region_id: str, employee_id: str) -> EmployeeRecord | None: ...

    @abstractmethod
    def get_employee_by_email(self, region_id: str, email: str) -> EmployeeRecord | None: ...

    @abstractmethod
    def get_department(self, region_id: str, department_id: str) -> DepartmentRecord | None: ...

    @abstractmethod
    def list_departments(self, region_id: str) -> list[DepartmentRecord]: ...

    @abstractmethod
    def create_employee(
        self, region_id: str, employee_id: str, payload: EmployeeCreate
    ) -> EmployeeRecord: ...

    @abstractmethod
    def update_employee(
        self, region_id: str, employee_id: str, patch: EmployeeUpdate
    ) -> EmployeeRecord | None: ...

    @abstractmethod
    def delete_employee(self, region_id: str, employee_id: str) -> bool: ...

    @abstractmethod
    def update_department(
        self, region_id: str, department_id: str, patch: DepartmentUpdate
    ) -> DepartmentRecord | None: ...
