// services/kanban.service.ts

import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as mockService from "./kanban.board.mock.service"
import * as apiService from "./kanban.board.api.service"

const kanbanService = shouldUseMockApi() ? mockService : apiService

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
export const moveTask = kanbanService.moveTask

export const getProjectImageOptions = kanbanService.getProjectImageOptions
