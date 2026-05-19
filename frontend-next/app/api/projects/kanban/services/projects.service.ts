// import {
//   categoryColumnTypeMapMock,
//   defaultColumnTypeMock,
//   projectImageOptions,
//   projectsMock,
//   staffMock,
//   taskPathMapMock,
// } from "@/lib/mocks/kanban.mock"
// import type {
//   ColumnType,
//   KanbanProject,
//   Staff,
//   Task,
// } from "../../types"
// import { columnTypesMock } from "../../types"

// export async function getProjects(year: string): Promise<KanbanProject[]> {
//   console.log("selected year:", year)
//   return Promise.resolve(projectsMock)
// }

// export async function getStaffList(): Promise<Staff[]> {
//   return Promise.resolve(staffMock)
// }

// export async function getColumnTypes(): Promise<readonly ColumnType[]> {
//   return Promise.resolve(columnTypesMock)
// }

// export async function getTaskPathMap(): Promise<Record<ColumnType, string>> {
//   return Promise.resolve(taskPathMapMock)
// }

// export async function getColumnTypeByCategoryTitle(
//   categoryTitle: string
// ): Promise<ColumnType> {
//   return Promise.resolve(
//     categoryColumnTypeMapMock[categoryTitle.trim()] ?? defaultColumnTypeMock
//   )
// }

// export async function createProject(
//   project: Omit<KanbanProject, "id">
// ): Promise<KanbanProject> {
//   const newProject: KanbanProject = {
//     ...project,
//     id: crypto.randomUUID(),
//   }

//   projectsMock.push(newProject)

//   return Promise.resolve(newProject)
// }

// export async function updateProject(
//   projectId: string,
//   updatedProject: Partial<KanbanProject>
// ): Promise<KanbanProject | null> {
//   const projectIndex = projectsMock.findIndex(
//     (project) => project.id === projectId
//   )

//   if (projectIndex === -1) return null

//   projectsMock[projectIndex] = {
//     ...projectsMock[projectIndex],
//     ...updatedProject,
//   }

//   return Promise.resolve(projectsMock[projectIndex])
// }

// export async function deleteProject(projectId: string): Promise<boolean> {
//   const projectIndex = projectsMock.findIndex(
//     (project) => project.id === projectId
//   )

//   if (projectIndex === -1) return false

//   projectsMock.splice(projectIndex, 1)

//   return Promise.resolve(true)
// }

// export async function createTask(
//   projectId: string,
//   categoryId: string,
//   task: Omit<Task, "id">
// ): Promise<Task | null> {
//   const project = projectsMock.find((project) => project.id === projectId)
//   if (!project) return null

//   const category = project.categories.find(
//     (category) => category.id === categoryId
//   )
//   if (!category) return null

//   const newTask: Task = {
//     ...task,
//     id: crypto.randomUUID(),
//   }

//   category.tasks.push(newTask)

//   return Promise.resolve(newTask)
// }

// export async function updateTask(
//   projectId: string,
//   categoryId: string,
//   taskId: string,
//   updatedTask: Partial<Task>
// ): Promise<Task | null> {
//   const project = projectsMock.find((project) => project.id === projectId)
//   if (!project) return null

//   const category = project.categories.find(
//     (category) => category.id === categoryId
//   )
//   if (!category) return null

//   const taskIndex = category.tasks.findIndex((task) => task.id === taskId)
//   if (taskIndex === -1) return null

//   category.tasks[taskIndex] = {
//     ...category.tasks[taskIndex],
//     ...updatedTask,
//   }

//   return Promise.resolve(category.tasks[taskIndex])
// }

// export async function deleteTask(
//   projectId: string,
//   categoryId: string,
//   taskId: string
// ): Promise<boolean> {
//   const project = projectsMock.find((project) => project.id === projectId)
//   if (!project) return false

//   const category = project.categories.find(
//     (category) => category.id === categoryId
//   )
//   if (!category) return false

//   const taskIndex = category.tasks.findIndex((task) => task.id === taskId)
//   if (taskIndex === -1) return false

//   category.tasks.splice(taskIndex, 1)

//   return Promise.resolve(true)
// }

// export async function getProjectImageOptions() {
//   return Promise.resolve(projectImageOptions)
// }