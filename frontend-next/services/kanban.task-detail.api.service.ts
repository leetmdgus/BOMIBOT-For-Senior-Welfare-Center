import type {
  BusinessEvaluationData,
  BusinessEvaluationTemplate,
  BusinessPlanDocument,
  EvaluationFile,
  SaveBusinessEvaluationPayload,
  SaveBusinessPlanPayload,
  Survey,
} from "./kanban.task-detail.types"
import { apiClient, apiFetchBlobWithMeta, resolveApiPath } from "@/lib/api-client"
import { triggerBlobDownload } from "@/lib/files/download-blob"
import { cachedApiGet, invalidateApiGetCache } from "@/lib/api-get-cache"

function taskDetailCacheKey(taskId: string, suffix: string) {
  return `task-detail:${taskId.trim()}:${suffix}`
}

function invalidateTaskDetailCache(taskId: string) {
  const tid = taskId.trim()
  invalidateApiGetCache(`task-detail:${tid}`)
  invalidateApiGetCache(`taskId=${encodeURIComponent(tid)}`)
  invalidateApiGetCache(`performance:input:${tid}`)
}

const base = (path: string) =>
  resolveApiPath(`/api/kanban/task-detail${path}`, `/api/v1/kanban/task-detail${path}`)

const TASK_DETAIL_GET_TTL_MS = 60_000

export async function getSurveys(taskId: string): Promise<Survey[]> {
  const path = `${base("/surveys")}?taskId=${encodeURIComponent(taskId)}`
  return cachedApiGet(path, () => apiClient.get<Survey[]>(path), {
    key: taskDetailCacheKey(taskId, "surveys"),
    ttlMs: TASK_DETAIL_GET_TTL_MS,
  })
}

export async function getEvaluationFiles(taskId: string): Promise<EvaluationFile[]> {
  const path = `${base("/files")}?taskId=${encodeURIComponent(taskId)}`
  return cachedApiGet(path, () => apiClient.get<EvaluationFile[]>(path), {
    key: taskDetailCacheKey(taskId, "files"),
    ttlMs: TASK_DETAIL_GET_TTL_MS,
  })
}

export async function getViewTogetherFixedFiles(): Promise<EvaluationFile[]> {
  const path = base("/view-together-files")
  return cachedApiGet(path, () => apiClient.get<EvaluationFile[]>(path), {
    key: "task-detail:view-together-files",
    ttlMs: TASK_DETAIL_GET_TTL_MS,
  })
}

export async function getBusinessEvaluationTemplate(
  taskId: string,
): Promise<BusinessEvaluationTemplate> {
  const path = `${base("/evaluation/template")}?taskId=${encodeURIComponent(taskId)}`
  return cachedApiGet(path, () => apiClient.get<BusinessEvaluationTemplate>(path), {
    key: taskDetailCacheKey(taskId, "evaluation-template"),
    ttlMs: TASK_DETAIL_GET_TTL_MS,
  })
}

export async function getBusinessEvaluation(
  taskId: string,
): Promise<BusinessEvaluationData> {
  const path = `${base("/evaluation")}?taskId=${encodeURIComponent(taskId)}`
  return cachedApiGet(path, () => apiClient.get<BusinessEvaluationData>(path), {
    key: taskDetailCacheKey(taskId, "evaluation"),
    ttlMs: TASK_DETAIL_GET_TTL_MS,
  })
}

export async function saveBusinessEvaluation(
  taskId: string,
  payload: SaveBusinessEvaluationPayload,
): Promise<BusinessEvaluationData> {
  const result = await apiClient.patch<BusinessEvaluationData>(base("/evaluation"), {
    taskId,
    ...payload,
  })
  invalidateTaskDetailCache(taskId)
  return result
}

export async function completeBusinessEvaluation(
  taskId: string,
): Promise<BusinessEvaluationData> {
  const result = await apiClient.post<BusinessEvaluationData>(
    base("/evaluation/complete"),
    { taskId },
  )
  invalidateTaskDetailCache(taskId)
  return result
}

export async function getBusinessPlan(
  taskId: string,
): Promise<BusinessPlanDocument> {
  const path = `${base("/business-plan")}?taskId=${encodeURIComponent(taskId)}`
  return cachedApiGet(path, () => apiClient.get<BusinessPlanDocument>(path), {
    key: taskDetailCacheKey(taskId, "plan"),
    ttlMs: TASK_DETAIL_GET_TTL_MS,
  })
}

export async function saveBusinessPlan(
  taskId: string,
  payload: SaveBusinessPlanPayload,
): Promise<BusinessPlanDocument> {
  const result = await apiClient.patch<BusinessPlanDocument>(base("/business-plan"), {
    taskId,
    ...payload,
  })
  invalidateTaskDetailCache(taskId)
  return result
}

export type SaveTaskDocumentsPayload = {
  plan?: SaveBusinessPlanPayload
  evaluation?: SaveBusinessEvaluationPayload
}

export type SaveTaskDocumentsResult = {
  plan?: BusinessPlanDocument
  evaluation?: BusinessEvaluationData
}

/** 사업계획서·사업평가를 한 번의 API 호출로 저장 */
export async function downloadBusinessPlanHwpx(
  taskId: string,
  payload?: {
    formData?: SaveBusinessPlanPayload["formData"]
    sections?: SaveBusinessPlanPayload["sections"]
  },
): Promise<void> {
  const { blob, filename } = await apiFetchBlobWithMeta(
    base("/business-plan/hwpx"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        ...(payload?.formData ? { formData: payload.formData } : {}),
        ...(payload?.formData
          ? { sections: payload.sections ?? [] }
          : payload?.sections
            ? { sections: payload.sections }
            : {}),
      }),
    },
  )
  triggerBlobDownload(blob, filename ?? "사업_사업계획.hwpx")
}

export async function downloadBusinessEvaluationHwpx(
  taskId: string,
  payload?: {
    evaluation?: SaveBusinessEvaluationPayload
    planForm?: SaveBusinessPlanPayload["formData"] | null
  },
): Promise<void> {
  const body: Record<string, unknown> = { taskId }
  if (payload?.evaluation) {
    body.evaluation = payload.evaluation
  }
  if (payload && "planForm" in payload) {
    body.planForm = payload.planForm ?? null
  }

  const { blob, filename } = await apiFetchBlobWithMeta(
    base("/evaluation/hwpx"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
  triggerBlobDownload(blob, filename ?? "사업_사업평가.hwpx")
}

export async function saveTaskDocuments(
  taskId: string,
  payload: SaveTaskDocumentsPayload,
): Promise<SaveTaskDocumentsResult> {
  const result = await apiClient.patch<SaveTaskDocumentsResult>(base("/documents"), {
    taskId,
    ...payload,
  })
  invalidateTaskDetailCache(taskId)
  return result
}
