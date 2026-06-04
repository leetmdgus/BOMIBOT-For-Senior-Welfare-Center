import { apiClient, apiUploadFormData, resolveApiPath } from "@/lib/api-client"
import { cachedApiGet, invalidateApiGetCache } from "@/lib/api-get-cache"

import type {
  CreateEmployeeInput,
  CreateEmployeeResult,
  Department,
  DepartmentOption,
  Employee,
  OrganizationContext,
  OrganizationSearchResult,
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
  // 사업관리 보드 필터(filterProjectsByAssignee)가 boards 응답 직후 직렬로 호출하던 조회.
  // 짧은 TTL 캐시로 재방문·연도전환 시 추가 왕복 제거. 직원/부서 mutation 시 invalidateApiGetCache("org").
  return cachedApiGet(
    CONTEXT_PATH,
    () => apiClient.get<OrganizationContext>(CONTEXT_PATH),
    { key: "org:context", ttlMs: 60_000 },
  )
}

export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  const data = await apiClient.get<{ departments: DepartmentOption[] }>(
    DEPARTMENTS_PATH,
  )
  return data.departments
}

// 회원가입(비로그인)용 — 지역별 부서 목록을 공개 엔드포인트에서 조회한다.
export async function getPublicDepartmentOptions(
  regionId: string,
): Promise<DepartmentOption[]> {
  const path = resolveApiPath(
    `/api/public/departments/${encodeURIComponent(regionId)}`,
    `/api/v1/public/departments/${encodeURIComponent(regionId)}`,
  )
  const data = await apiClient.get<{ departments: DepartmentOption[] }>(path)
  return data.departments
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<CreateEmployeeResult> {
  const result = await apiClient.post<CreateEmployeeResult>(EMPLOYEES_PATH, input)
  invalidateApiGetCache("org")
  return result
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  const result = await apiClient.patch<Employee>(
    resolveApiPath(
      `/api/employees/${employeeId}`,
      `/api/v1/employees/${employeeId}`,
    ),
    input,
  )
  invalidateApiGetCache("org")
  return result
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  await apiClient.delete<void>(
    resolveApiPath(
      `/api/employees/${employeeId}`,
      `/api/v1/employees/${employeeId}`,
    ),
  )
  invalidateApiGetCache("org")
}

export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<DepartmentOption> {
  const result = await apiClient.patch<DepartmentOption>(
    resolveApiPath(
      `/api/departments/${departmentId}`,
      `/api/v1/departments/${departmentId}`,
    ),
    input,
  )
  invalidateApiGetCache("org")
  return result
}

export async function uploadEmployeeProfileImage(
  employeeId: string,
  file: File,
): Promise<{ profileImage: string }> {
  const formData = new FormData()
  formData.append("file", file)
  const result = await apiUploadFormData<{ profileImage: string }>(
    resolveApiPath(
      `/api/employees/${employeeId}/profile-image`,
      `/api/v1/employees/${employeeId}/profile-image`,
    ),
    formData,
  )
  invalidateApiGetCache("org")
  return result
}
