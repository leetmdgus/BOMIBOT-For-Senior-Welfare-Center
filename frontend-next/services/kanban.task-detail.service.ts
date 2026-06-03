import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./kanban.task-detail.api.service"
import * as mockService from "./kanban.task-detail.mock.service"

const taskDetailService = shouldUseMockApi() ? mockService : apiService

export const getSurveys = taskDetailService.getSurveys
export const getEvaluationFiles = taskDetailService.getEvaluationFiles
export const getViewTogetherFixedFiles =
  taskDetailService.getViewTogetherFixedFiles
export const getBusinessEvaluationTemplate =
  taskDetailService.getBusinessEvaluationTemplate
export const getBusinessEvaluation = taskDetailService.getBusinessEvaluation
export const saveBusinessEvaluation = taskDetailService.saveBusinessEvaluation
export const completeBusinessEvaluation =
  taskDetailService.completeBusinessEvaluation
export const getBusinessPlan = taskDetailService.getBusinessPlan
export const saveBusinessPlan = taskDetailService.saveBusinessPlan
export const saveTaskDocuments = taskDetailService.saveTaskDocuments

export const downloadBusinessPlanHwpx = shouldUseMockApi()
  ? undefined
  : apiService.downloadBusinessPlanHwpx

export const downloadBusinessEvaluationHwpx = shouldUseMockApi()
  ? undefined
  : apiService.downloadBusinessEvaluationHwpx
