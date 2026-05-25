import type { KanbanDocumentsResponse } from "./kanban.documents.types"
import { apiClient, resolveApiPath } from "@/lib/api-client"

export type DocumentsReportQuery = {
  year?: number
  quarter?: number
  periodMode?: "quarter" | "month"
}

function reportsPath(query = "") {
  return resolveApiPath(`/api/reports${query}`, `/api/v1/reports${query}`)
}

function buildReportsQuery(
  type?: "performance" | "budget" | "business-plan",
  filters?: DocumentsReportQuery,
): string {
  const params = new URLSearchParams()
  if (type) params.set("type", type)
  if (filters?.year != null) params.set("year", String(filters.year))
  if (filters?.quarter != null) params.set("quarter", String(filters.quarter))
  if (filters?.periodMode) params.set("periodMode", filters.periodMode)
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ""
}

async function fetchDocuments(
  type?: "performance" | "budget" | "business-plan",
  filters?: DocumentsReportQuery,
): Promise<KanbanDocumentsResponse | unknown> {
  return apiClient.get(reportsPath(buildReportsQuery(type, filters)))
}

export async function getKanbanDocuments(): Promise<KanbanDocumentsResponse> {
  return fetchDocuments() as Promise<KanbanDocumentsResponse>
}

export async function getPerformanceReportRows(filters?: DocumentsReportQuery) {
  const data = (await fetchDocuments("performance", filters)) as {
    performanceRows: KanbanDocumentsResponse["performanceRows"]
  }
  return data.performanceRows
}

export async function getBudgetReportRows(filters?: DocumentsReportQuery) {
  const data = (await fetchDocuments("budget", filters)) as {
    budgetRows: KanbanDocumentsResponse["budgetRows"]
  }
  return data.budgetRows
}

export async function getBusinessPlanReport(filters?: DocumentsReportQuery) {
  const data = (await fetchDocuments("business-plan", filters)) as {
    businessPlan: KanbanDocumentsResponse["businessPlan"]
  }
  return data.businessPlan
}

export async function saveReports(
  body: Record<string, unknown>,
  type?: "performance" | "budget" | "business-plan",
): Promise<unknown> {
  const query = type ? `?type=${type}` : ""
  return apiClient.put(reportsPath(query), body)
}
