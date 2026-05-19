import { departmentsData } from "@/lib/mocks/organization.mock"
import type { Department, Employee } from "./organization.types"

export async function getDepartments(): Promise<Department[]> {
  return departmentsData
}

export async function searchEmployees(params?: {
  search?: string
  department?: string
}): Promise<{ departments: Department[]; employees: Employee[] }> {
  const keyword = params?.search?.trim().toLowerCase() ?? ""

  const departments = departmentsData.map((department) => ({
    ...department,
    employees: department.employees.filter((employee) => {
      const matchesDepartment =
        !params?.department || employee.department === params.department

      if (!keyword) return matchesDepartment

      return (
        matchesDepartment &&
        (employee.name.toLowerCase().includes(keyword) ||
          employee.email.toLowerCase().includes(keyword) ||
          employee.department.toLowerCase().includes(keyword))
      )
    }),
  }))

  const employees = departments.flatMap((department) => department.employees)

  return { departments, employees }
}
