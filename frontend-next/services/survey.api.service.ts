import type {
  SaveSurveyPayload,
  SaveSurveyResult,
  SubmitSurveyResponsePayload,
  SubmitSurveyResponseResult,
  SurveyDetail,
  SurveyListItem,
  SurveyResults,
} from "./survey.types"
import { apiClient, resolveApiPath } from "@/lib/api-client"
import { invalidateApiGetCache } from "@/lib/api-get-cache"

const surveysPath = (suffix = "") =>
  resolveApiPath(`/api/surveys${suffix}`, `/api/v1/surveys${suffix}`)

export async function getSurveyList(options?: {
  taskId?: string
  status?: string
  search?: string
}): Promise<SurveyListItem[]> {
  const params = new URLSearchParams()
  if (options?.taskId) params.set("taskId", options.taskId)
  if (options?.status) params.set("status", options.status)
  if (options?.search) params.set("search", options.search)
  const query = params.toString()
  return apiClient.get<SurveyListItem[]>(
    surveysPath(query ? `?${query}` : ""),
  )
}

export async function getSurveyDetail(
  id: string,
  options?: { taskId?: string },
): Promise<SurveyDetail> {
  const params = new URLSearchParams()
  if (options?.taskId) params.set("taskId", options.taskId)
  const query = params.toString()
  return apiClient.get<SurveyDetail>(
    surveysPath(`/${id}${query ? `?${query}` : ""}`),
  )
}

export async function saveSurvey(
  id: string,
  payload: SaveSurveyPayload,
): Promise<SaveSurveyResult> {
  const params = new URLSearchParams()
  if (payload.taskId) params.set("taskId", payload.taskId)
  const query = params.toString()
  const { taskId: _taskId, ...body } = payload
  const result = await apiClient.post<SaveSurveyResult>(
    surveysPath(`/${id}${query ? `?${query}` : ""}`),
    body,
  )
  invalidateApiGetCache("surveys")
  if (payload.taskId) {
    invalidateApiGetCache(`taskId=${encodeURIComponent(payload.taskId)}`)
  }
  return result
}

export async function getSurveyResults(id: string): Promise<SurveyResults> {
  return apiClient.get<SurveyResults>(surveysPath(`/${id}/results`))
}

export async function submitSurveyResponse(
  id: string,
  payload: SubmitSurveyResponsePayload,
): Promise<SubmitSurveyResponseResult> {
  return apiClient.post<SubmitSurveyResponseResult>(
    surveysPath(`/${id}/responses`),
    payload,
  )
}

export async function deleteSurvey(id: string): Promise<{
  success: boolean
  deletedId: string
}> {
  return apiClient.delete(surveysPath(`/${id}`))
}
