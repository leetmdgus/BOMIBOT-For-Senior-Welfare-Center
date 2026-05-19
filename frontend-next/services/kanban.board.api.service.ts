// services/kanban.api.service.ts

import { ColumnType, CreateProjectRequest, CreateProjectResponse, KanbanProject, ProjectImageOption, Staff, Task } from "./kanban.board.types"


async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getProjects(year: string): Promise<KanbanProject[]> {
  return apiFetch<KanbanProject[]>(`/api/kanban/boards?year=${year}`)
}


export async function getStaffList(): Promise<Staff[]> {
  return apiFetch<Staff[]>("/api/kanban/staff")
}

export async function getColumnTypes(): Promise<readonly ColumnType[]> {
  return apiFetch<readonly ColumnType[]>("/api/kanban/column-types")
}

export async function getTaskPathMap(): Promise<Record<ColumnType, string>> {
  return apiFetch<Record<ColumnType, string>>("/api/kanban/task-path-map")
}

export async function getColumnTypeByCategoryTitle(
  categoryTitle: string
): Promise<ColumnType> {
  return apiFetch<ColumnType>(
    `/api/kanban/categories/column-type?title=${encodeURIComponent(categoryTitle)}`
  )
}


export async function createProject(
  project: CreateProjectRequest
): Promise<CreateProjectResponse> {
  return apiFetch<CreateProjectResponse>("/api/kanban/boards", {
    method: "POST",
    body: JSON.stringify(project),
  })
}

export async function updateProject(
  projectId: string,
  updatedProject: Partial<KanbanProject>
): Promise<KanbanProject | null> {
  return apiFetch<KanbanProject>(`/api/kanban/boards/${projectId}/details`, {
    method: "PATCH",
    body: JSON.stringify(updatedProject),
  })
}

export async function deleteProject(projectId: string): Promise<boolean> {
  await apiFetch(`/api/kanban/boards/${projectId}`, {
    method: "DELETE",
  })

  return true
}

export async function createTask(
  projectId: string,
  categoryId: string,
  task: Omit<Task, "id">
): Promise<Task | null> {
  return apiFetch<Task>(
    `/api/kanban/boards/${projectId}/categories/${categoryId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(task),
    }
  )
}

export async function updateTask(
  projectId: string,
  categoryId: string,
  taskId: string,
  updatedTask: Partial<Task>
): Promise<Task | null> {
  return apiFetch<Task>(
    `/api/kanban/boards/${projectId}/categories/${categoryId}/tasks/${taskId}/details`,
    {
      method: "PATCH",
      body: JSON.stringify(updatedTask),
    }
  )
}

export async function deleteTask(
  projectId: string,
  categoryId: string,
  taskId: string
): Promise<boolean> {
  await apiFetch(
    `/api/kanban/boards/${projectId}/categories/${categoryId}/tasks/${taskId}`,
    {
      method: "DELETE",
    }
  )

  return true
}

export async function getProjectImageOptions(): Promise<ProjectImageOption[]> {
  return apiFetch<ProjectImageOption[]>("/api/kanban/project-image-options")
}