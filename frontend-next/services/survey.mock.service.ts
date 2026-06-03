import {
  buildSurveyDetailFromListItem,
  getDefaultSurveyTemplate,
} from "@/lib/mocks/survey.mock"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import { normalizeTaskId } from "@/lib/kanban/resolve-card-title"

const STATUS_TO_KR: Record<string, SurveyListItem["status"]> = {
  active: "진행중",
  closed: "완료",
  draft: "임시",
  scheduled: "예정",
}
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
  /** taskId → 설문 id 목록 (칸반 업무별 목록) */
  taskIndex: Map<string, Set<string>>
}

const runtimeByRegion = new Map<RegionId, SurveyRuntime>()

async function getSurveyRuntime(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  let runtime = runtimeByRegion.get(store.regionId)

  if (!runtime) {
    runtime = {
      detailStore: new Map(Object.entries(store.survey.surveyDetailsMock)),
      responseStore: new Map(),
      taskIndex: new Map(),
    }
    runtimeByRegion.set(store.regionId, runtime)
  }

  return { store, runtime }
}

function detailToListItem(detail: SurveyDetail): SurveyListItem {
  const statusKey = detail.basicInfo.status
  return {
    id: detail.id,
    title: detail.basicInfo.title,
    program: detail.overview.name || detail.basicInfo.title,
    date: detail.overview.startDate,
    status: STATUS_TO_KR[statusKey] ?? "임시",
    endDate: detail.overview.endDate,
    responseCount: 0,
  }
}

export async function getSurveyList(
  options?: { taskId?: string; status?: string; search?: string },
  regionId?: RegionId,
): Promise<SurveyListItem[]> {
  const { store, runtime } = await getSurveyRuntime(regionId)

  if (!options?.taskId) {
    return store.survey.surveyListItemsMock
  }

  const tid = normalizeTaskId(options.taskId)
  const ids = runtime.taskIndex.get(tid) ?? new Set<string>()
  const fromRuntime: SurveyListItem[] = []

  for (const surveyId of ids) {
    const detail = runtime.detailStore.get(surveyId)
    if (detail) {
      fromRuntime.push(detailToListItem(detail))
    }
  }

  const fromMockCatalog = store.survey.surveyListItemsMock.filter((item) => {
    const detail = runtime.detailStore.get(item.id)
    return detail?.taskId && normalizeTaskId(detail.taskId) === tid
  })

  const { getSurveys } = await import("@/services/kanban.task-detail.mock.service")
  const kanbanRows = await getSurveys(tid, regionId)
  const kanbanItems: SurveyListItem[] = kanbanRows.map((row) => ({
    id: row.id,
    title: row.title,
    program: row.program,
    date: row.date,
    status: row.status,
    endDate: row.endDate,
  }))

  const merged = new Map<string, SurveyListItem>()
  for (const item of [...fromRuntime, ...fromMockCatalog, ...kanbanItems]) {
    merged.set(item.id, item)
  }
  return [...merged.values()]
}

export async function getSurveyDetail(
  id: string,
  regionId?: RegionId,
): Promise<SurveyDetail> {
  const { store, runtime } = await getSurveyRuntime(regionId)

  if (id === "new") {
    const template = getDefaultSurveyTemplate(store.orgName)
    return template
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
  const { store, runtime } = await getSurveyRuntime(regionId)
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

  const linkedTask = payload.taskId
    ? normalizeTaskId(payload.taskId)
    : existing.taskId
      ? normalizeTaskId(existing.taskId)
      : null
  if (linkedTask) {
    nextDetail.taskId = linkedTask
    const bucket = runtime.taskIndex.get(linkedTask) ?? new Set<string>()
    bucket.add(nextId)
    runtime.taskIndex.set(linkedTask, bucket)

    const listItem = detailToListItem(nextDetail)
    const mockList = store.survey.surveyListItemsMock
    const existingIndex = mockList.findIndex((item) => item.id === nextId)
    if (existingIndex >= 0) {
      mockList[existingIndex] = listItem
    } else {
      mockList.push(listItem)
    }
  }

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
    throw new Error("저장되지 않은 설문입니다.")
  }

  if (!detail.settings.acceptResponses || detail.basicInfo.status !== "active") {
    throw new Error("현재 이 설문은 응답을 받지 않습니다.")
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
      positiveRate: 0,
    },
    questions: [],
  }
}
