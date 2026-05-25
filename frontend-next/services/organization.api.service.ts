import { apiClient, apiUploadFormData, resolveApiPath } from "@/lib/api-client"

import type {
  Department,
  DepartmentOption,
  Employee,
  OrganizationContext,
  OrganizationSearchResult,
  CreateEmployeeInput,
  UpdateDepartmentInput,
  UpdateEmployeeInput,
} from "./organization.types"

const EMPLOYEES_PATH = resolveApiPath("/api/employees", "/api/v1/employees")

export async function getDepartments(): Promise<Department[]> {
  const data = await apiClient.get<{ departments: Department[] }>(EMPLOYEES_PATH)
  return data.departments
}

export async function searchEmployees(params?: {
  search?: string
  department?: string
}): Promise<OrganizationSearchResult> {
  const searchParams = new URLSearchParams()

  if (params?.search) searchParams.set("search", params.search)
  if (params?.department) searchParams.set("department", params.department)

  const query = searchParams.toString()
  return apiClient.get<OrganizationSearchResult>(
    `${EMPLOYEES_PATH}${query ? `?${query}` : ""}`,
  )
}

const CONTEXT_PATH = resolveApiPath(
  "/api/employees/context",
  "/api/v1/employees/context",
)
const DEPARTMENTS_PATH = resolveApiPath(
  "/api/employees/departments",
  "/api/v1/employees/departments",
)

export async function getOrganizationContext(): Promise<OrganizationContext> {
  return apiClient.get<OrganizationContext>(CONTEXT_PATH)
}

export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  const data = await apiClient.get<{ departments: DepartmentOption[] }>(
    DEPARTMENTS_PATH,
  )
  return data.departments
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  return apiClient.post<Employee>(EMPLOYEES_PATH, input)
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  return apiClient.patch<Employee>(
    resolveApiPath(
      `/api/employees/${employeeId}`,
      `/api/v1/employees/${employeeId}`,
    ),
    input,
  )
}

export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<DepartmentOption> {
  return apiClient.patch<DepartmentOption>(
    resolveApiPath(
      `/api/departments/${departmentId}`,
      `/api/v1/departments/${departmentId}`,
    ),
    input,
  )
}

export async function uploadEmployeeProfileImage(
  employeeId: string,
  file: File,
): Promise<{ profileImage: string }> {
  const formData = new FormData()
  formData.append("file", file)
  return apiUploadFormData<{ profileImage: string }>(
    resolveApiPath(
      `/api/employees/${employeeId}/profile-image`,
      `/api/v1/employees/${employeeId}/profile-image`,
    ),
    formData,
  )
}
