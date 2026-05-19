export const columnTypesMock = [
  "실적관리",
  "사업계획",
  "만족도조사",
  "사업평가",
] as const

export type ColumnType = (typeof columnTypesMock)[number]

export interface Task {
  id?: string
  title: string
  description: string
  assignee: string
  completedCount?: number
  totalCount?: number
}

export interface Category {
  id?: string
  title: ColumnType
  color: string
  tasks: Task[]
}

export interface KanbanProject {
  id?: string
  number: string
  title: string
  team?: string
  manager?: string
  image?: string
  year: string
  categories: Category[]
}

export interface ProjectEditFormData {
  title: string
  imageFile: File | null
  imagePreview?: string
}

export interface Staff {
  id: string
  name: string
  team: string
  position: string
}

export interface ProjectImageOption {
  label: string
  value: string
}