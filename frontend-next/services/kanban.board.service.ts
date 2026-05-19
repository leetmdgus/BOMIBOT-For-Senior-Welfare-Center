// services/kanban.service.ts

import * as mockService from "./kanban.board.mock.service"
import * as apiService from "./kanban.board.api.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const kanbanService = useMockApi ? mockService : apiService

export const getProjects = kanbanService.getProjects
export const getStaffList = kanbanService.getStaffList
export const getColumnTypes = kanbanService.getColumnTypes
export const getTaskPathMap = kanbanService.getTaskPathMap
export const getColumnTypeByCategoryTitle = kanbanService.getColumnTypeByCategoryTitle

export const createProject = kanbanService.createProject
export const updateProject = kanbanService.updateProject
export const deleteProject = kanbanService.deleteProject

export const createTask = kanbanService.createTask
export const updateTask = kanbanService.updateTask
export const deleteTask = kanbanService.deleteTask

export const getProjectImageOptions = kanbanService.getProjectImageOptions