import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { DocumentsReportQuery } from "./kanban.documents.api.service"
import type {
  BusinessPlanReport,
  KanbanDocumentsResponse,
} from "./kanban.documents.types"

export async function getKanbanDocuments(): Promise<KanbanDocumentsResponse> {
  const store = await loadRegionStore()

  return {
    performanceRows: store.documents.performanceReportRows,
    budgetRows: store.documents.budgetReportRows,
    businessPlan: store.documents.businessPlanReportMock,
  }
}

export async function getPerformanceReportRows(_filters?: DocumentsReportQuery) {
  const store = await loadRegionStore()
  return store.documents.performanceReportRows
}

export async function getBudgetReportRows() {
  const store = await loadRegionStore()
  return store.documents.budgetReportRows
}

export async function getBusinessPlanReport(): Promise<BusinessPlanReport> {
  const store = await loadRegionStore()
  return store.documents.businessPlanReportMock
}

export async function saveReports(
  _body: Record<string, unknown>,
  _type?: "performance" | "budget" | "business-plan",
) {
  return getKanbanDocuments()
}
