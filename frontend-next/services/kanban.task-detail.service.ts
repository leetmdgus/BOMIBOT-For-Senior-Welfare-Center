import * as apiService from "./kanban.task-detail.api.service"
import * as mockService from "./kanban.task-detail.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const taskDetailService = useMockApi ? mockService : apiService

export const getSurveys = taskDetailService.getSurveys
export const getEvaluationFiles = taskDetailService.getEvaluationFiles
export const getBusinessEvaluation = taskDetailService.getBusinessEvaluation
export const saveBusinessEvaluation = taskDetailService.saveBusinessEvaluation
export const completeBusinessEvaluation =
  taskDetailService.completeBusinessEvaluation

export const getViewTogetherFixedFiles = mockService.getViewTogetherFixedFiles
