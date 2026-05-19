import {
  budgetReportRows,
  businessPlanReportMock,
  performanceReportRows,
} from "@/lib/mocks/kanban.documents.mock"
import type {
  BusinessPlanReport,
  KanbanDocumentsResponse,
} from "./kanban.documents.types"

export async function getKanbanDocuments(): Promise<KanbanDocumentsResponse> {
  return {
    performanceRows: performanceReportRows,
    budgetRows: budgetReportRows,
    businessPlan: businessPlanReportMock,
  }
}

export async function getPerformanceReportRows() {
  return performanceReportRows
}

export async function getBudgetReportRows() {
  return budgetReportRows
}

export async function getBusinessPlanReport(): Promise<BusinessPlanReport> {
  return businessPlanReportMock
}
