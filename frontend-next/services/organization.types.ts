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
}

export interface Department {
  id: string
  name: string
  count: number
  employees: Employee[]
}

export type TabType = "department" | "position"

export type DetailTabType =
  | "contact"
  | "work"
  | "hr"