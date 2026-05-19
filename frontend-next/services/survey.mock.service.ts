import {
  buildSurveyDetailFromListItem,
  getDefaultSurveyTemplate,
  surveyDetailsMock,
  surveyListItemsMock,
  surveyResultsMock,
} from "@/lib/mocks/survey.mock"
import type {
  SaveSurveyPayload,
  SaveSurveyResult,
  SubmitSurveyResponsePayload,
  SubmitSurveyResponseResult,
  SurveyDetail,
  SurveyListItem,
  SurveyResults,
} from "./survey.types"

const detailStore = new Map<string, SurveyDetail>(
  Object.entries(surveyDetailsMock)
)

const responseStore = new Map<string, SubmitSurveyResponsePayload[]>()

export async function getSurveyList(): Promise<SurveyListItem[]> {
  return surveyListItemsMock
}

export async function getSurveyDetail(id: string): Promise<SurveyDetail> {
  if (id === "new") {
    return getDefaultSurveyTemplate()
  }

  const stored = detailStore.get(id)

  if (stored) {
    return structuredClone(stored)
  }

  const listItem = surveyListItemsMock.find((item) => item.id === id)
  if (listItem) {
    const fromList = buildSurveyDetailFromListItem(listItem)
    detailStore.set(id, fromList)
    return structuredClone(fromList)
  }

  const template = getDefaultSurveyTemplate()
  template.id = id
  template.settings.acceptResponses = true
  template.basicInfo.status = "active"
  return template
}

export async function saveSurvey(
  id: string,
  payload: SaveSurveyPayload
): Promise<SaveSurveyResult> {
  const existing = await getSurveyDetail(id)
  const nextId = id === "new" ? `survey-${Date.now()}` : id

  const nextDetail: SurveyDetail = {
    ...existing,
    id: nextId,
    overview: payload.overview,
    basicInfo: {
      ...payload.basicInfo,
      status:
        payload.saveType === "publish" ? "active" : payload.basicInfo.status,
    },
    questions: payload.questions,
    style: payload.style
      ? { ...existing.style, ...payload.style }
      : existing.style,
    settings: payload.settings
      ? { ...existing.settings, ...payload.settings }
      : existing.settings,
  }

  detailStore.set(nextId, nextDetail)

  return {
    id: nextId,
    savedAt: new Date().toISOString(),
    status: nextDetail.basicInfo.status,
  }
}

export async function submitSurveyResponse(
  id: string,
  payload: SubmitSurveyResponsePayload
): Promise<SubmitSurveyResponseResult> {
  const detail = await getSurveyDetail(id)

  if (id === "new") {
    throw new Error("게시되지 않은 설문입니다.")
  }

  if (!detail.settings.acceptResponses || detail.basicInfo.status !== "active") {
    throw new Error("현재 응답을 받지 않는 설문입니다.")
  }

  const stored = responseStore.get(id) ?? []
  stored.push(structuredClone(payload))
  responseStore.set(id, stored)

  const listItem = surveyListItemsMock.find((item) => item.id === id)
  if (listItem) {
    listItem.responseCount = (listItem.responseCount ?? 0) + 1
  }

  return {
    responseId: `resp-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    message: detail.style.thankYouMessage,
  }
}

export async function getSurveyResults(id: string): Promise<SurveyResults> {
  const results = surveyResultsMock[id]

  if (results) {
    return structuredClone(results)
  }

  const listItem = surveyListItemsMock.find((item) => item.id === id)

  return {
    surveyId: id,
    summary: {
      totalResponses: listItem?.responseCount ?? 0,
      totalTarget: listItem?.totalTarget ?? 0,
      averageSatisfaction: listItem?.satisfaction ?? 0,
      completionRate: listItem?.totalTarget
        ? Math.round(
            ((listItem.responseCount ?? 0) / listItem.totalTarget) * 100
          )
        : 0,
    },
    questions: [],
  }
}
