export interface Employee {
  id: string
  name: string
  role: string
  position: string
  department: string
  email: string
  phone: string
  joinDate: string
  tenure: string
  lastLogin: string
  isAdmin?: boolean
  /** public/ 기준 프로필 사진 경로 (예: "/이승현_증명사진.jpg") */
  profileImage?: string
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