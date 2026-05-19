import type {
  MonthlyPlanResponse,
  MonthlyPlanVersion,
  PerformanceListResponse,
} from "./kanban.performance.types"

export async function getInputManagementRows() {
  const response = await fetch("/api/performance?scope=input-management")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  const result = await response.json()

  return result.data
}

export async function getPerformanceRows(params?: {
  projectId?: string
  month?: string
}): Promise<PerformanceListResponse> {
  const searchParams = new URLSearchParams()

  if (params?.projectId) searchParams.set("projectId", params.projectId)
  if (params?.month) searchParams.set("month", params.month)

  const query = searchParams.toString()
  const response = await fetch(`/api/performance${query ? `?${query}` : ""}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getMonthlyPlan(
  version: MonthlyPlanVersion = "기본계획"
): Promise<MonthlyPlanResponse> {
  const response = await fetch(
    `/api/performance/monthly-plan?version=${encodeURIComponent(version)}`
  )

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}
