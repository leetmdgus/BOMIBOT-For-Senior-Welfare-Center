export interface Employee {
  id: string
  name: string
  role: string
  position: string
  department: string
  departmentId?: string
  email: string
  phone: string
  joinDate: string
  tenure: string
  lastLogin: string
  isAdmin?: boolean
  isTeamLeader?: boolean
  /** public/ 기준 프로필 사진 경로 (예: "/이승현_증명사진.jpg") */
  profileImage?: string
}

export interface OrganizationPermissions {
  canEditDepartment: boolean
  canAssignTeamLeader: boolean
  canCreateEmployee: boolean
  isAdmin: boolean
  isTeamLeader: boolean
  isManagement: boolean
}

export interface OrganizationContext {
  employeeId: string | null
  department: string
  permissions: OrganizationPermissions
}

export interface DepartmentOption {
  id: string
  name: string
}

export interface CreateEmployeeInput {
  name: string
  departmentId: string
  email: string
  role?: string
  position?: string
  phone?: string
  joinDate?: string
  profileImage?: string
  isTeamLeader?: boolean
  isAdmin?: boolean
}

/** 직원 추가 API 응답 — 초기 로그인 비밀번호 안내 */
export type CreateEmployeeResult = Employee & {
  initialPassword?: string
}

export interface UpdateEmployeeInput {
  name?: string
  role?: string
  position?: string
  departmentId?: string
  email?: string
  phone?: string
  joinDate?: string
  profileImage?: string
  isTeamLeader?: boolean
  isAdmin?: boolean
}

export interface UpdateDepartmentInput {
  name?: string
}

export interface Department {
  id: string
  name: string
  count: number
  employees: Employee[]
}

/** 조직 검색 API 응답 */
export interface OrganizationSearchResult {
  departments: Department[]
  positionGroups: Department[]
  employees: Employee[]
}

export type TabType = "department" | "position"

export type DetailTabType =
  | "contact"
  | "work"
  | "hr"