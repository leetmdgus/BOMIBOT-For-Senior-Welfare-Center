export type Priority = "LOW" | "MEDIUM" | "HIGH"

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  assignee: string
  progressCount: string
  completedCount: number
  totalCount: number
}

export interface ProjectCategory {
  id: string
  title: string
  color: string
  tasks: Task[]
}

export interface Project {
  id: string
  number: string
  title: string
  team: string
  manager: string
  categories: ProjectCategory[]
}