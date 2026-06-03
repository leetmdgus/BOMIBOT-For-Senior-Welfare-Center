import { cachedApiGet, invalidateApiGetCache } from "@/lib/api-get-cache"
import { apiClient, resolveApiPath } from "@/lib/api-client"
import { filterProjectsByAssignee } from "@/lib/kanban/project-access"
import { normalizeTaskId } from "@/lib/kanban/resolve-card-title"
import {
  DEFAULT_KANBAN_STAFF,
  DEFAULT_PROJECT_IMAGE_OPTIONS,
  resolveColumnTypeForCategoryTitle,
} from "@/lib/kanban/static-config"

import type {
  ColumnType,
  CreateProjectRequest,
  CreateProjectResponse,
  KanbanProject,
  ProjectImageOption,
  Staff,
  Task,
} from "./kanban.board.types"

function kanbanPath(nextSuffix: string): string {
  return resolveApiPath(`/api/kanban${nextSuffix}`, `/api/v1/kanban${nextSuffix}`)
}

function scopedKanbanId(id: string): string {
  return normalizeTaskId(id)
}

export async function getProjects(year: string): Promise<KanbanProject[]> {
  const path = `${kanbanPath("/boards")}?year=${encodeURIComponent(year)}`
  const projects = await cachedApiGet(
    path,
    () => apiClient.get<KanbanProject[]>(path),
    { key: `kanban:boards:${year}` },
  )
  return filterProjectsByAssignee(projects)
}

export async function getStaffList(): Promise<Staff[]> {
  const path = kanbanPath("/staff")
  return cachedApiGet(
    path,
    async () => {
      try {
        const staff = await apiClient.get<Staff[]>(path)
        return staff.length > 0 ? staff : DEFAULT_KANBAN_STAFF
      } catch {
        return DEFAULT_KANBAN_STAFF
      }
    },
    { key: "kanban:staff", ttlMs: 120_000 },
  )
}

export async function getColumnTypes(): Promise<readonly ColumnType[]> {
  return apiClient.get<readonly ColumnType[]>(kanbanPath("/column-types"))
}

export async function getTaskPathMap(): Promise<Record<ColumnType, string>> {
  return apiClient.get<Record<ColumnType, string>>(kanbanPath("/task-path-map"))
}

/** 백엔드 static_config 와 동일 — 네트워크/프록시 500 회피 */
export async function getColumnTypeByCategoryTitle(
  categoryTitle: string,
): Promise<ColumnType> {
  return resolveColumnTypeForCategoryTitle(categoryTitle)
}

export async function createProject(
  project: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  const result = await apiClient.post<CreateProjectResponse>(
    kanbanPath("/boards"),
    project,
  )
  invalidateApiGetCache("kanban")
  return result
}

export async function updateProject(
  projectId: string,
  updatedProject: Partial<KanbanProject>,
): Promise<KanbanProject | null> {
  const result = await apiClient.patch<KanbanProject>(
    kanbanPath(`/boards/${projectId}/details`),
    updatedProject,
  )
  invalidateApiGetCache("kanban")
  return result
}

export async function deleteProject(projectId: string): Promise<boolean> {
  await apiClient.delete(kanbanPath(`/boards/${projectId}`))
  invalidateApiGetCache("kanban")
  return true
}

export async function createTask(
  projectId: string,
  categoryId: string,
  task: Omit<Task, "id">,
): Promise<Task | null> {
  const result = await apiClient.post<Task>(
    kanbanPath(`/boards/${projectId}/categories/${categoryId}/tasks`),
    task,
  )
  invalidateApiGetCache("kanban")
  return result
}

export async function updateTask(
  projectId: string,
  categoryId: string,
  taskId: string,
  updatedTask: Partial<Task>,
): Promise<Task | null> {
  const pid = scopedKanbanId(projectId)
  const cid = scopedKanbanId(categoryId)
  const tid = scopedKanbanId(taskId)
  const result = await apiClient.patch<Task>(
    kanbanPath(`/boards/${pid}/categories/${cid}/tasks/${tid}/details`),
    {
      title: updatedTask.title,
      description: updatedTask.description,
      assignee: updatedTask.assignee,
      completedCount: updatedTask.completedCount,
      totalCount: updatedTask.totalCount,
    },
  )
  invalidateApiGetCache("kanban")
  return result
}

export async function deleteTask(
  projectId: string,
  categoryId: string,
  taskId: string,
): Promise<boolean> {
  await apiClient.delete(
    kanbanPath(
      `/boards/${scopedKanbanId(projectId)}/categories/${scopedKanbanId(categoryId)}/tasks/${scopedKanbanId(taskId)}`,
    ),
  )
  invalidateApiGetCache("kanban")
  return true
}

export interface MoveTaskRequest {
  taskId: string
  fromCategoryId: string
  toCategoryId: string
  overTaskId?: string
}

export async function moveTask(
  projectId: string,
  payload: MoveTaskRequest,
): Promise<Task | null> {
  const result = await apiClient.post<Task>(
    kanbanPath(`/boards/${scopedKanbanId(projectId)}/tasks/move`),
    {
      taskId: scopedKanbanId(payload.taskId),
      fromCategoryId: scopedKanbanId(payload.fromCategoryId),
      toCategoryId: scopedKanbanId(payload.toCategoryId),
      overTaskId: payload.overTaskId
        ? scopedKanbanId(payload.overTaskId)
        : undefined,
    },
  )
  invalidateApiGetCache("kanban")
  return result
}

export async function getProjectImageOptions(): Promise<ProjectImageOption[]> {
  const path = kanbanPath("/project-image-options")
  return cachedApiGet(
    path,
    async () => {
      try {
        const images = await apiClient.get<ProjectImageOption[]>(path)
        return images.length > 0 ? images : DEFAULT_PROJECT_IMAGE_OPTIONS
      } catch {
        return DEFAULT_PROJECT_IMAGE_OPTIONS
      }
    },
    { key: "kanban:project-images", ttlMs: 120_000 },
  )
}
