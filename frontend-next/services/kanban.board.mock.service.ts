import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import { columnTypesMock } from "./kanban.board.types"
import type {
  ColumnType,
  CreateProjectRequest,
  CreateProjectResponse,
  KanbanProject,
  ProjectImageOption,
  Staff,
  Task,
} from "./kanban.board.types"

async function getKanban(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.kanban
}

export async function getProjects(
  year: string,
  regionId?: RegionId,
): Promise<KanbanProject[]> {
  const kanban = await getKanban(regionId)
  return kanban.projectsMock.filter((project) => project.year === year)
}

export async function getStaffList(regionId?: RegionId): Promise<Staff[]> {
  const kanban = await getKanban(regionId)
  return kanban.staffMock
}

export async function getColumnTypes(): Promise<readonly ColumnType[]> {
  return columnTypesMock
}

export async function getTaskPathMap(
  regionId?: RegionId,
): Promise<Record<ColumnType, string>> {
  const kanban = await getKanban(regionId)
  return kanban.taskPathMapMock
}

export async function getColumnTypeByCategoryTitle(
  categoryTitle: string,
  regionId?: RegionId,
): Promise<ColumnType> {
  const kanban = await getKanban(regionId)
  return (
    kanban.categoryColumnTypeMapMock[categoryTitle.trim()] ??
    kanban.defaultColumnTypeMock
  )
}

export async function createProject(
  project: CreateProjectRequest,
  regionId?: RegionId,
): Promise<CreateProjectResponse> {
  const kanban = await getKanban(regionId)
  const now = new Date().toISOString()
  const projectId = crypto.randomUUID()

  const newProject: CreateProjectResponse = {
    id: projectId,
    assignees: project.assignees,
    description: project.description,
    project_image: project.project_image,
    project_name: project.project_name,
    title: project.title,
    created_at: now,
    updated_at: now,
  }

  const taskTitle = project.title?.trim() || project.project_name

  const newBoardProject: KanbanProject = {
    id: projectId,
    number: String(kanban.projectsMock.length + 1).padStart(2, "0"),
    title: project.project_name,
    team: project.assignees?.[0]?.team ?? "",
    manager: project.assignees?.[0]
      ? `${project.assignees[0].team} ${project.assignees[0].name} ${project.assignees[0].position}`
      : "",
    image: project.project_image,
    year: project.year ?? new Date().getFullYear().toString(),
    categories: kanban.createDefaultProjectCategories(
      taskTitle
        ? {
            initialTask: {
              title: taskTitle,
              description: project.description ?? "",
              assignee: project.assignees?.[0]?.name ?? "",
              completedCount: 0,
              totalCount: 0,
            },
          }
        : undefined,
    ),
  }

  kanban.projectsMock.push(newBoardProject)

  return newProject
}

export async function updateProject(
  projectId: string,
  updatedProject: Partial<KanbanProject>,
  regionId?: RegionId,
): Promise<KanbanProject | null> {
  const kanban = await getKanban(regionId)
  const projectIndex = kanban.projectsMock.findIndex(
    (project) => project.id === projectId,
  )

  if (projectIndex === -1) return null

  kanban.projectsMock[projectIndex] = {
    ...kanban.projectsMock[projectIndex],
    ...updatedProject,
  }

  return kanban.projectsMock[projectIndex]
}

export async function deleteProject(
  projectId: string,
  regionId?: RegionId,
): Promise<boolean> {
  const kanban = await getKanban(regionId)
  const projectIndex = kanban.projectsMock.findIndex(
    (project) => project.id === projectId,
  )

  if (projectIndex === -1) return false

  kanban.projectsMock.splice(projectIndex, 1)
  return true
}

export async function createTask(
  projectId: string,
  categoryId: string,
  task: Omit<Task, "id">,
  regionId?: RegionId,
): Promise<Task | null> {
  const kanban = await getKanban(regionId)
  const project = kanban.projectsMock.find((item) => item.id === projectId)
  if (!project) return null

  const category = project.categories.find((item) => item.id === categoryId)
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
  updatedTask: Partial<Task>,
  regionId?: RegionId,
): Promise<Task | null> {
  const kanban = await getKanban(regionId)
  const project = kanban.projectsMock.find((item) => item.id === projectId)
  if (!project) return null

  const category = project.categories.find((item) => item.id === categoryId)
  if (!category) return null

  const taskIndex = category.tasks.findIndex((item) => item.id === taskId)
  if (taskIndex === -1) return null

  category.tasks[taskIndex] = {
    ...category.tasks[taskIndex],
    ...updatedTask,
  }

  return category.tasks[taskIndex]
}

export async function moveTask(
  projectId: string,
  payload: {
    taskId: string
    fromCategoryId: string
    toCategoryId: string
    overTaskId?: string
  },
  regionId?: RegionId,
): Promise<Task | null> {
  const kanban = await getKanban(regionId)
  const project = kanban.projectsMock.find((item) => item.id === projectId)
  if (!project) return null

  const fromCategory = project.categories.find(
    (item) => item.id === payload.fromCategoryId,
  )
  const toCategory = project.categories.find(
    (item) => item.id === payload.toCategoryId,
  )
  if (!fromCategory || !toCategory) return null

  const taskIndex = fromCategory.tasks.findIndex(
    (item) => item.id === payload.taskId,
  )
  if (taskIndex === -1) return null

  const [movingTask] = fromCategory.tasks.splice(taskIndex, 1)
  const overIndex = payload.overTaskId
    ? toCategory.tasks.findIndex((item) => item.id === payload.overTaskId)
    : -1

  if (overIndex >= 0) {
    toCategory.tasks.splice(overIndex, 0, movingTask)
  } else {
    toCategory.tasks.push(movingTask)
  }

  return movingTask
}

export async function deleteTask(
  projectId: string,
  categoryId: string,
  taskId: string,
  regionId?: RegionId,
): Promise<boolean> {
  const kanban = await getKanban(regionId)
  const project = kanban.projectsMock.find((item) => item.id === projectId)
  if (!project) return false

  const category = project.categories.find((item) => item.id === categoryId)
  if (!category) return false

  const taskIndex = category.tasks.findIndex((item) => item.id === taskId)
  if (taskIndex === -1) return false

  category.tasks.splice(taskIndex, 1)
  return true
}

export async function getProjectImageOptions(
  regionId?: RegionId,
): Promise<ProjectImageOption[]> {
  const kanban = await getKanban(regionId)
  return kanban.projectImageOptions
}
