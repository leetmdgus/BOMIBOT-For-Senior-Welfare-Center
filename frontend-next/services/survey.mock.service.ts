import {
  buildSurveyDetailFromListItem,
  getDefaultSurveyTemplate,
} from "@/lib/mocks/survey.mock"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import type {
  SaveSurveyPayload,
  SaveSurveyResult,
  SubmitSurveyResponsePayload,
  SubmitSurveyResponseResult,
  SurveyDetail,
  SurveyListItem,
  SurveyResults,
} from "./survey.types"

type SurveyRuntime = {
  detailStore: Map<string, SurveyDetail>
  responseStore: Map<string, SubmitSurveyResponsePayload[]>
}

const runtimeByRegion = new Map<RegionId, SurveyRuntime>()

async function getSurveyRuntime(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  let runtime = runtimeByRegion.get(store.regionId)

  if (!runtime) {
    runtime = {
      detailStore: new Map(Object.entries(store.survey.surveyDetailsMock)),
      responseStore: new Map(),
    }
    runtimeByRegion.set(store.regionId, runtime)
  }

  return { store, runtime }
}

export async function getSurveyList(regionId?: RegionId): Promise<SurveyListItem[]> {
  const { store } = await getSurveyRuntime(regionId)
  return store.survey.surveyListItemsMock
}

export async function getSurveyDetail(
  id: string,
  regionId?: RegionId,
): Promise<SurveyDetail> {
  const { store, runtime } = await getSurveyRuntime(regionId)

  if (id === "new") {
    return getDefaultSurveyTemplate()
  }

  const stored = runtime.detailStore.get(id)
  if (stored) {
    return structuredClone(stored)
  }

  const listItem = store.survey.surveyListItemsMock.find((item) => item.id === id)
  if (listItem) {
    const fromList = buildSurveyDetailFromListItem(listItem)
    runtime.detailStore.set(id, fromList)
    return structuredClone(fromList)
  }

  const template = await getSurveyDetail("new", regionId)
  template.id = id
  template.settings.acceptResponses = true
  template.basicInfo.status = "active"
  return template
}

export async function saveSurvey(
  id: string,
  payload: SaveSurveyPayload,
  regionId?: RegionId,
): Promise<SaveSurveyResult> {
  const { runtime } = await getSurveyRuntime(regionId)
  const existing = await getSurveyDetail(id, regionId)
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

  runtime.detailStore.set(nextId, nextDetail)

  return {
    id: nextId,
    savedAt: new Date().toISOString(),
    status: nextDetail.basicInfo.status,
  }
}

export async function submitSurveyResponse(
  id: string,
  payload: SubmitSurveyResponsePayload,
  regionId?: RegionId,
): Promise<SubmitSurveyResponseResult> {
  const { store, runtime } = await getSurveyRuntime(regionId)
  const detail = await getSurveyDetail(id, regionId)

  if (id === "new") {
    throw new Error("???? ?? ?????.")
  }

  if (!detail.settings.acceptResponses || detail.basicInfo.status !== "active") {
    throw new Error("?? ??? ?? ?? ?????.")
  }

  const stored = runtime.responseStore.get(id) ?? []
  stored.push(structuredClone(payload))
  runtime.responseStore.set(id, stored)

  const listItem = store.survey.surveyListItemsMock.find((item) => item.id === id)
  if (listItem) {
    listItem.responseCount = (listItem.responseCount ?? 0) + 1
  }

  return {
    responseId: `resp-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    message: detail.style.thankYouMessage,
  }
}

export async function deleteSurvey(_id: string) {
  return { success: true, deletedId: _id }
}

export async function getSurveyResults(
  id: string,
  regionId?: RegionId,
): Promise<SurveyResults> {
  const { store } = await getSurveyRuntime(regionId)
  const results = store.survey.surveyResultsMock[id]

  if (results) {
    return structuredClone(results)
  }

  const listItem = store.survey.surveyListItemsMock.find((item) => item.id === id)

  return {
    surveyId: id,
    summary: {
      totalResponses: listItem?.responseCount ?? 0,
      totalTarget: listItem?.totalTarget ?? 0,
      averageSatisfaction: listItem?.satisfaction ?? 0,
      completionRate: listItem?.totalTarget
        ? Math.round(
            ((listItem.responseCount ?? 0) / listItem.totalTarget) * 100,
          )
        : 0,
    },
    questions: [],
  }
}
