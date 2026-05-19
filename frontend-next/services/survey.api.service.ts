import type {
  SaveSurveyPayload,
  SaveSurveyResult,
  SubmitSurveyResponsePayload,
  SubmitSurveyResponseResult,
  SurveyDetail,
  SurveyListItem,
  SurveyResults,
} from "./survey.types"

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getSurveyList(): Promise<SurveyListItem[]> {
  return apiFetch<SurveyListItem[]>("/api/surveys")
}

export async function getSurveyDetail(id: string): Promise<SurveyDetail> {
  return apiFetch<SurveyDetail>(`/api/surveys/${id}`)
}

export async function saveSurvey(
  id: string,
  payload: SaveSurveyPayload
): Promise<SaveSurveyResult> {
  return apiFetch<SaveSurveyResult>(`/api/surveys/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getSurveyResults(id: string): Promise<SurveyResults> {
  return apiFetch<SurveyResults>(`/api/surveys/${id}/results`)
}

export async function submitSurveyResponse(
  id: string,
  payload: SubmitSurveyResponsePayload
): Promise<SubmitSurveyResponseResult> {
  return apiFetch<SubmitSurveyResponseResult>(`/api/surveys/${id}/responses`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
