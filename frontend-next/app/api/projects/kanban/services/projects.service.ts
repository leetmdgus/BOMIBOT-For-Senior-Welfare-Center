import { Project } from "@/lib/mock-data";
import {
  categoryColumnTypeMapMock,
  columnTypesMock,
  defaultColumnTypeMock,
  projectImageOptions,
  projectsMock,
  staffMock,
  taskPathMapMock,
  type ColumnType,
  type KanbanProject,
  type ProjectImageOption,
  type Staff,
  type Task,
} from "../../mocks/kanban.mock"

export async function getProjects(year: string): Promise<Project[]> {
  // TODO: API 연결 시 아래 mock 반환을 fetch로 교체
  // const res = await fetch(`/api/projects?year=${year}`)
  // return res.json()

  console.log("selected year:", year)
  return Promise.resolve(projectsMock)
}

export async function getProjectOptions(): Promise<
  { id: string; name: string }[]
> {
  // TODO: API 연결 시 GET /api/projects/options 로 교체
  return Promise.resolve(
    projectsMock.map((project) => ({
      id: project.id,
      name: project.title,
    }))
  )
}

export async function getStaffList(): Promise<Staff[]> {
  // TODO: API 연결 시 GET /api/staff 로 교체
  return Promise.resolve(staffMock)
}

export async function getColumnTypes(): Promise<readonly ColumnType[]> {
  // TODO: API 연결 시 GET /api/projects/kanban/columns 로 교체
  return Promise.resolve(columnTypesMock)
}

export async function getTaskPathMap(): Promise<Record<ColumnType, string>> {
  // TODO: API 연결 시 GET /api/projects/kanban/task-path-map 로 교체
  return Promise.resolve(taskPathMapMock)
}

export async function getColumnTypeByCategoryTitle(
  categoryTitle: string
): Promise<ColumnType> {
  // TODO: API 연결 시 GET /api/projects/kanban/column-type?title=${categoryTitle} 로 교체
  return Promise.resolve(
    categoryColumnTypeMapMock[categoryTitle.trim()] ?? defaultColumnTypeMock
  )
}

export async function createProject(
  project: Omit<Project, "id">
): Promise<Project> {
  // TODO: API 연결 시 POST /api/projects 로 교체
  const newProject: Project = {
    ...project,
    id: crypto.randomUUID(),
  }

  projectsMock.push(newProject)

  return Promise.resolve(newProject)
}

export async function updateProject(
  projectId: string,
  updatedProject: Partial<Project>
): Promise<Project | null> {
  // TODO: API 연결 시 PATCH /api/projects/${projectId} 로 교체
  const projectIndex = projectsMock.findIndex(
    (project) => project.id === projectId
  )

  if (projectIndex === -1) return null

  projectsMock[projectIndex] = {
    ...projectsMock[projectIndex],
    ...updatedProject,
  }

  return Promise.resolve(projectsMock[projectIndex])
}

export async function deleteProject(projectId: string): Promise<boolean> {
  // TODO: API 연결 시 DELETE /api/projects/${projectId} 로 교체
  const projectIndex = projectsMock.findIndex(
    (project) => project.id === projectId
  )

  if (projectIndex === -1) return false

  projectsMock.splice(projectIndex, 1)

  return Promise.resolve(true)
}

export async function createTask(
  projectId: string,
  categoryId: string,
  task: Omit<Task, "id">
): Promise<Task | null> {
  // TODO: API 연결 시 POST /api/projects/${projectId}/categories/${categoryId}/tasks 로 교체
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

  return Promise.resolve(newTask)
}

export async function updateTask(
  projectId: string,
  categoryId: string,
  taskId: string,
  updatedTask: Partial<Task>
): Promise<Task | null> {
  // TODO: API 연결 시 PATCH /api/projects/${projectId}/categories/${categoryId}/tasks/${taskId} 로 교체
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

  return Promise.resolve(category.tasks[taskIndex])
}

export async function deleteTask(
  projectId: string,
  categoryId: string,
  taskId: string
): Promise<boolean> {
  // TODO: API 연결 시 DELETE /api/projects/${projectId}/categories/${categoryId}/tasks/${taskId} 로 교체
  const project = projectsMock.find((project) => project.id === projectId)
  if (!project) return false

  const category = project.categories.find(
    (category) => category.id === categoryId
  )
  if (!category) return false

  const taskIndex = category.tasks.findIndex((task) => task.id === taskId)
  if (taskIndex === -1) return false

  category.tasks.splice(taskIndex, 1)

  return Promise.resolve(true)
}

export async function getProjectImageOptions() {
  // TODO: API 연결 시 GET /api/projects/images 로 교체
  return Promise.resolve(projectImageOptions)
}