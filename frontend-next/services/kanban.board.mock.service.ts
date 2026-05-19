// services/kanban.mock.service.ts
import {
  categoryColumnTypeMapMock,
  defaultColumnTypeMock,
  projectImageOptions,
  projectsMock,
  staffMock,
  taskPathMapMock,
} from "@/lib/mocks/kanban.board.mock"
import { ColumnType, columnTypesMock, KanbanProject, Staff, Task } from "./kanban.board.types"

export async function getProjects(year: string): Promise<KanbanProject[]> {
  console.log("mock selected year:", year)

  return projectsMock.filter(
    (project) => project.year === year
  )
}
export async function getStaffList(): Promise<Staff[]> {
  return staffMock
}

export async function getColumnTypes(): Promise<readonly ColumnType[]> {
  return columnTypesMock
}

export async function getTaskPathMap(): Promise<Record<ColumnType, string>> {
  return taskPathMapMock
}

export async function getColumnTypeByCategoryTitle(
  categoryTitle: string
): Promise<ColumnType> {
  return categoryColumnTypeMapMock[categoryTitle.trim()] ?? defaultColumnTypeMock
}

export async function createProject(
  project: Omit<KanbanProject, "id">
): Promise<KanbanProject> {
  const newProject: KanbanProject = {
    ...project,
    id: crypto.randomUUID(),
  }

  projectsMock.push(newProject)

  return newProject
}

export async function updateProject(
  projectId: string,
  updatedProject: Partial<KanbanProject>
): Promise<KanbanProject | null> {
  const projectIndex = projectsMock.findIndex(
    (project) => project.id === projectId
  )

  if (projectIndex === -1) return null

  projectsMock[projectIndex] = {
    ...projectsMock[projectIndex],
    ...updatedProject,
  }

  return projectsMock[projectIndex]
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const projectIndex = projectsMock.findIndex(
    (project) => project.id === projectId
  )

  if (projectIndex === -1) return false

  projectsMock.splice(projectIndex, 1)

  return true
}

export async function createTask(
  projectId: string,
  categoryId: string,
  task: Omit<Task, "id">
): Promise<Task | null> {
  const project = projectsMock.find((project) => project.id === projectId)
  if (!project) return null

  const category = project.categories.find(
    (category) => category.id === categoryId
  )
  if (!category) return null

  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
  }

  category.tasks.push(newTask)

  return newTask
}

export async function updateTask(
  projectId: string,
  categoryId: string,
  taskId: string,
  updatedTask: Partial<Task>
): Promise<Task | null> {
  const project = projectsMock.find((project) => project.id === projectId)
  if (!project) return null

  const category = project.categories.find(
    (category) => category.id === categoryId
  )
  if (!category) return null

  const taskIndex = category.tasks.findIndex((task) => task.id === taskId)
  if (taskIndex === -1) return null

  category.tasks[taskIndex] = {
    ...category.tasks[taskIndex],
    ...updatedTask,
  }

  return category.tasks[taskIndex]
}

export async function deleteTask(
  projectId: string,
  categoryId: string,
  taskId: string
): Promise<boolean> {
  const project = projectsMock.find((project) => project.id === projectId)
  if (!project) return false

  const category = project.categories.find(
    (category) => category.id === categoryId
  )
  if (!category) return false

  const taskIndex = category.tasks.findIndex((task) => task.id === taskId)
  if (taskIndex === -1) return false

  category.tasks.splice(taskIndex, 1)

  return true
}

export async function getProjectImageOptions() {
  return projectImageOptions
}