import { departmentsData } from "@/lib/mocks/organization.mock"
import {
  buildPositionGroups,
  getAllEmployeesFromDepartments,
} from "@/lib/organization-groups"
import type {
  Department,
  Employee,
  OrganizationSearchResult,
} from "./organization.types"

function filterEmployee(
  employee: Employee,
  keyword: string,
  departmentName?: string,
): boolean {
  const matchesDepartment =
    !departmentName || employee.department === departmentName

  if (!keyword) return matchesDepartment

  return (
    matchesDepartment &&
    (employee.name.toLowerCase().includes(keyword) ||
      employee.email.toLowerCase().includes(keyword) ||
      employee.department.toLowerCase().includes(keyword) ||
      employee.role.toLowerCase().includes(keyword) ||
      employee.position.toLowerCase().includes(keyword))
  )
}

function filterDepartments(
  source: Department[],
  keyword: string,
  departmentName?: string,
): Department[] {
  return source.map((department) => ({
    ...department,
    employees: department.employees.filter((employee) =>
      filterEmployee(employee, keyword, departmentName),
    ),
  }))
}

export async function getDepartments(): Promise<Department[]> {
  return departmentsData
}

export async function searchEmployees(params?: {
  search?: string
  department?: string
}): Promise<OrganizationSearchResult> {
  const keyword = params?.search?.trim().toLowerCase() ?? ""

  const departments = filterDepartments(
    departmentsData,
    keyword,
    params?.department,
  )

  const allFiltered = getAllEmployeesFromDepartments(departments)
  const positionGroups = buildPositionGroups(allFiltered)

  return {
    departments,
    positionGroups,
    employees: allFiltered,
  }
}
