import { getClientSession } from "@/lib/auth/session"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import {
  buildPositionGroups,
  getAllEmployeesFromDepartments,
} from "@/lib/organization-groups"
import {
  canAssignTeamLeader,
  canCreateEmployee,
  canEditDepartment,
  canFullHrEdit,
  isSelfEmployee,
} from "@/lib/organization-permissions"
import type { RegionId } from "@/lib/auth/regions"
import type {
  CreateEmployeeInput,
  Department,
  DepartmentOption,
  Employee,
  OrganizationContext,
  OrganizationSearchResult,
  UpdateEmployeeInput,
} from "./organization.types"

const employeeOverrides = new Map<string, Employee>()

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

function applyOverrides(employee: Employee): Employee {
  return { ...employee, ...employeeOverrides.get(employee.id) }
}

function filterDepartments(
  source: Department[],
  keyword: string,
  departmentName?: string,
): Department[] {
  return source.map((department) => ({
    ...department,
    employees: department.employees
      .map(applyOverrides)
      .filter((employee) => filterEmployee(employee, keyword, departmentName)),
  }))
}

async function getOrganizationData(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.organization.departmentsData
}

function findEmployeeByEmail(
  departments: Department[],
  email: string,
): Employee | null {
  const normalized = email.trim().toLowerCase()
  for (const dept of departments) {
    for (const emp of dept.employees) {
      if (emp.email.toLowerCase() === normalized) {
        return applyOverrides(emp)
      }
    }
  }
  return null
}

function buildMockContext(departments: Department[]): OrganizationContext {
  const session = getClientSession()
  const appAdmin = session?.roleType === "admin"
  const linked = session?.email
    ? findEmployeeByEmail(departments, session.email)
    : null

  const isTeamLeader =
    Boolean(linked?.isTeamLeader) ||
    Boolean(linked?.role?.includes("팀장") || linked?.position?.includes("팀장"))
  const isManagement =
    appAdmin ||
    Boolean(
      linked &&
        ["관장", "부장", "실장", "차장", "과장", "팀장", "총괄", "관리자"].some(
          (kw) =>
            `${linked.role} ${linked.position}`.includes(kw),
        ),
    )
  const isAdmin = appAdmin || Boolean(linked?.isAdmin)

  const permissions = {
    canEditDepartment: isAdmin || isManagement,
    canAssignTeamLeader: isAdmin,
    canCreateEmployee: isAdmin || isManagement || isTeamLeader,
    isAdmin,
    isTeamLeader,
    isManagement,
  }

  return {
    employeeId: linked?.id ?? null,
    department: linked?.department ?? session?.department ?? "",
    permissions,
  }
}

export async function getDepartments(regionId?: RegionId): Promise<Department[]> {
  const data = await getOrganizationData(regionId)
  return data.map((dept) => ({
    ...dept,
    employees: dept.employees.map(applyOverrides),
  }))
}

export async function searchEmployees(
  params?: {
    search?: string
    department?: string
  },
  regionId?: RegionId,
): Promise<OrganizationSearchResult> {
  const departmentsData = await getOrganizationData(regionId)
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

export async function getOrganizationContext(): Promise<OrganizationContext> {
  const departments = await getOrganizationData()
  return buildMockContext(departments)
}

export async function getDepartmentOptions(
  regionId?: RegionId,
): Promise<DepartmentOption[]> {
  const data = await getOrganizationData(regionId)
  return data
    .filter((d) => d.id !== "all")
    .map((d) => ({ id: d.id, name: d.name }))
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  const context = await getOrganizationContext()
  if (!canCreateEmployee(context.permissions)) {
    throw new Error("직원 추가 권한이 없습니다.")
  }

  const now = new Date().toISOString().slice(0, 10)
  const deptList = await getDepartmentOptions()
  const dept = deptList.find((d) => d.id === input.departmentId)
  const created: Employee = {
    id: `emp-mock-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name,
    role: input.role || "직원",
    position: input.position || input.role || "직원",
    department: dept?.name ?? "",
    departmentId: input.departmentId,
    email: input.email,
    phone: input.phone ?? "",
    joinDate: input.joinDate ?? now,
    tenure: "0년 0개월",
    lastLogin: "-",
    isAdmin: input.isAdmin,
    isTeamLeader: input.isTeamLeader,
    profileImage: input.profileImage,
  }
  employeeOverrides.set(created.id, created)
  return created
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  const departments = await getOrganizationData()
  const context = buildMockContext(departments)
  const all = getAllEmployeesFromDepartments(
    departments.map((d) => ({
      ...d,
      employees: d.employees.map(applyOverrides),
    })),
  )
  const current = all.find((e) => e.id === employeeId)
  if (!current) {
    throw new Error("직원을 찾을 수 없습니다.")
  }

  const selfOnly =
    isSelfEmployee(context, current) && !canFullHrEdit(context, current)

  if (selfOnly) {
    const updated: Employee = {
      ...current,
      name: input.name?.trim() ?? current.name,
      email: input.email?.trim() ?? current.email,
      phone: input.phone?.trim() ?? current.phone,
      profileImage: input.profileImage ?? current.profileImage,
    }
    employeeOverrides.set(employeeId, updated)
    return updated
  }

  if (!canFullHrEdit(context, current)) {
    throw new Error("수정 권한이 없습니다.")
  }

  const deptList = await getDepartmentOptions()
  const dept = deptList.find((d) => d.id === input.departmentId)

  const updated: Employee = {
    ...current,
    name: input.name?.trim() ?? current.name,
    role: input.role?.trim() ?? current.role,
    position: input.position?.trim() ?? current.position,
    departmentId: input.departmentId ?? current.departmentId,
    department: dept?.name ?? current.department,
    email: input.email?.trim() ?? current.email,
    phone: input.phone?.trim() ?? current.phone,
    joinDate: input.joinDate?.trim() ?? current.joinDate,
    profileImage: input.profileImage ?? current.profileImage,
    isTeamLeader:
      input.isTeamLeader !== undefined
        ? input.isTeamLeader
        : current.isTeamLeader,
    isAdmin:
      input.isAdmin !== undefined && canAssignTeamLeader(context.permissions)
        ? input.isAdmin
        : current.isAdmin,
  }
  employeeOverrides.set(employeeId, updated)
  return updated
}

export async function uploadEmployeeProfileImage(
  employeeId: string,
  file: File,
): Promise<{ profileImage: string }> {
  const url = URL.createObjectURL(file)
  const departments = await getOrganizationData()
  const context = buildMockContext(departments)
  const all = getAllEmployeesFromDepartments(departments)
  const current = all.find((e) => e.id === employeeId)
  if (!current) {
    throw new Error("직원을 찾을 수 없습니다.")
  }
  if (!isSelfEmployee(context, current) && !canFullHrEdit(context, current)) {
    throw new Error("프로필 사진 수정 권한이 없습니다.")
  }
  const updated = { ...current, profileImage: url }
  employeeOverrides.set(employeeId, updated)
  return { profileImage: url }
}

export async function updateDepartment(): Promise<DepartmentOption> {
  throw new Error("부서 수정은 FastAPI 백엔드 연결 시에만 사용할 수 있습니다.")
}
