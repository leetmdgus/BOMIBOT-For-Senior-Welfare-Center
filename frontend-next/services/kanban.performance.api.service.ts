import type {
  MonthlyPlanResponse,
  MonthlyPlanVersion,
  PerformanceInputMeta,
  PerformanceListResponse,
  PerformanceRow,
} from "./kanban.performance.types"
import { cachedApiGet, invalidateApiGetCache } from "@/lib/api-get-cache"
import { apiClient, resolveApiPath } from "@/lib/api-client"
import { requireTaskId } from "@/lib/kanban/require-task-id"

function invalidatePerformanceInputCache(taskId: string) {
  invalidateApiGetCache(`performance:input:${requireTaskId(taskId)}`)
}

const perfPath = (suffix = "") =>
  resolveApiPath(
    `/api/performance${suffix}`,
    `/api/v1/performance${suffix}`,
  )

export async function getInputManagementRows(
  taskId: string,
): Promise<PerformanceRow[]> {
  const tid = requireTaskId(taskId)
  const query = new URLSearchParams({
    scope: "input-management",
    taskId: tid,
  })
  const path = `${perfPath()}?${query.toString()}`
  const result = await cachedApiGet(
    path,
    () => apiClient.get<{ data: PerformanceRow[] }>(path),
    {
      key: `performance:input:${tid}`,
      ttlMs: 30_000,
    },
  )
  return result.data
}

export async function saveInputManagementRows(
  rows: PerformanceRow[],
  taskId: string,
): Promise<{ success: boolean; count: number }> {
  const tid = requireTaskId(taskId)
  const suffix = `/input-management?${new URLSearchParams({ taskId: tid }).toString()}`
  const result = await apiClient.put<{ success: boolean; count: number }>(
    perfPath(suffix),
    { rows },
  )
  invalidatePerformanceInputCache(tid)
  return result
}

const EMPTY_INPUT_META: PerformanceInputMeta = {
  subProjectChips: [],
  detailCategories: [],
}

export async function getPerformanceInputMeta(): Promise<PerformanceInputMeta> {
  const path = `${perfPath()}?scope=input-meta`
  try {
    return await cachedApiGet(path, () => apiClient.get<PerformanceInputMeta>(path), {
      key: "performance:input-meta",
      ttlMs: 120_000,
    })
  } catch {
    return EMPTY_INPUT_META
  }
}

export async function getPerformanceRows(params?: {
  projectId?: string
  month?: string
}): Promise<PerformanceListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.projectId) searchParams.set("projectId", params.projectId)
  if (params?.month) searchParams.set("month", params.month)
  const query = searchParams.toString()
  return apiClient.get<PerformanceListResponse>(
    perfPath(query ? `?${query}` : ""),
  )
}

export async function getMonthlyPlan(
  version: MonthlyPlanVersion = "기본계획",
): Promise<MonthlyPlanResponse> {
  return apiClient.get<MonthlyPlanResponse>(
    resolveApiPath(
      `/api/performance/monthly-plan?version=${encodeURIComponent(version)}`,
      `/api/v1/performance/monthly-plan?version=${encodeURIComponent(version)}`,
    ),
  )
}

export async function saveMonthlyPlan(
  version: MonthlyPlanVersion,
  payload: MonthlyPlanResponse,
): Promise<MonthlyPlanResponse> {
  return apiClient.put<MonthlyPlanResponse>(
    resolveApiPath(
      `/api/performance/monthly-plan?version=${encodeURIComponent(version)}`,
      `/api/v1/performance/monthly-plan?version=${encodeURIComponent(version)}`,
    ),
    payload,
  )
}

export async function createPerformanceRecord(
  body: Partial<PerformanceRow>,
): Promise<PerformanceRow> {
  return apiClient.post<PerformanceRow>(perfPath(), body)
}

export async function updatePerformanceRecord(
  body: Partial<PerformanceRow> & { id: string },
): Promise<PerformanceRow> {
  return apiClient.put<PerformanceRow>(perfPath(), body)
}

export async function deletePerformanceRecord(id: string): Promise<{
  success: boolean
  deletedId: string
}> {
  return apiClient.delete<{ success: boolean; deletedId: string }>(
    `${perfPath()}?id=${encodeURIComponent(id)}`,
  )
}
