import * as apiService from "./kanban.documents.api.service"
import * as mockService from "./kanban.documents.mock.service"
import type {
  BusinessPlanReport,
  BudgetReportRow,
  KanbanDocumentsResponse,
  PerformanceReportRow,
} from "./kanban.documents.types"

export type { DocumentsReportQuery } from "./kanban.documents.api.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

type KanbanDocumentsService = {
  getKanbanDocuments: () => Promise<KanbanDocumentsResponse>
  getPerformanceReportRows: (
    filters?: apiService.DocumentsReportQuery,
  ) => Promise<PerformanceReportRow[]>
  getBudgetReportRows: (
    filters?: apiService.DocumentsReportQuery,
  ) => Promise<BudgetReportRow[]>
  getBusinessPlanReport: (
    filters?: apiService.DocumentsReportQuery,
  ) => Promise<BusinessPlanReport>
  saveReports?: (
    body: Record<string, unknown>,
    type?: "performance" | "budget" | "business-plan",
  ) => Promise<unknown>
}

const documentsService: KanbanDocumentsService = useMockApi
  ? mockService
  : apiService

export const getKanbanDocuments = documentsService.getKanbanDocuments
export const getPerformanceReportRows = documentsService.getPerformanceReportRows
export const getBudgetReportRows = documentsService.getBudgetReportRows
export const getBusinessPlanReport = documentsService.getBusinessPlanReport
export const saveReports = documentsService.saveReports
