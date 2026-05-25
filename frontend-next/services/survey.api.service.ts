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

const surveysPath = (suffix = "") =>
  resolveApiPath(`/api/surveys${suffix}`, `/api/v1/surveys${suffix}`)

export async function getSurveyList(): Promise<SurveyListItem[]> {
  return apiClient.get<SurveyListItem[]>(surveysPath())
}

export async function getSurveyDetail(id: string): Promise<SurveyDetail> {
  return apiClient.get<SurveyDetail>(surveysPath(`/${id}`))
}

export async function saveSurvey(
  id: string,
  payload: SaveSurveyPayload,
): Promise<SaveSurveyResult> {
  return apiClient.post<SaveSurveyResult>(surveysPath(`/${id}`), payload)
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
