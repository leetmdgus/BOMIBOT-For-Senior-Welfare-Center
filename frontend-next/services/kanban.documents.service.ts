import * as apiService from "./kanban.documents.api.service"
import * as mockService from "./kanban.documents.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const documentsService = useMockApi ? mockService : apiService

export const getKanbanDocuments = documentsService.getKanbanDocuments
export const getPerformanceReportRows = documentsService.getPerformanceReportRows
export const getBudgetReportRows = documentsService.getBudgetReportRows
export const getBusinessPlanReport = documentsService.getBusinessPlanReport
