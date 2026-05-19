import type { KanbanDocumentsResponse } from "./kanban.documents.types"

async function fetchDocuments(
  type?: "performance" | "budget" | "business-plan"
): Promise<KanbanDocumentsResponse | unknown> {
  const query = type ? `?type=${type}` : ""
  const response = await fetch(`/api/reports${query}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getKanbanDocuments(): Promise<KanbanDocumentsResponse> {
  return fetchDocuments() as Promise<KanbanDocumentsResponse>
}

export async function getPerformanceReportRows() {
  const data = (await fetchDocuments("performance")) as {
    performanceRows: KanbanDocumentsResponse["performanceRows"]
  }

  return data.performanceRows
}

export async function getBudgetReportRows() {
  const data = (await fetchDocuments("budget")) as {
    budgetRows: KanbanDocumentsResponse["budgetRows"]
  }

  return data.budgetRows
}

export async function getBusinessPlanReport() {
  const data = (await fetchDocuments("business-plan")) as {
    businessPlan: KanbanDocumentsResponse["businessPlan"]
  }

  return data.businessPlan
}
