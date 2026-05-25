import type {
  BusinessEvaluationData,
  BusinessEvaluationTemplate,
  BusinessPlanDocument,
  EvaluationFile,
  SaveBusinessEvaluationPayload,
  SaveBusinessPlanPayload,
  Survey,
} from "./kanban.task-detail.types"
import { apiClient, resolveApiPath } from "@/lib/api-client"
import { invalidateApiGetCache } from "@/lib/api-get-cache"

function invalidateTaskDetailCache(taskId: string) {
  const tid = taskId.trim()
  invalidateApiGetCache(`taskId=${encodeURIComponent(tid)}`)
  invalidateApiGetCache(`performance:input:${tid}`)
}

const base = (path: string) =>
  resolveApiPath(`/api/kanban/task-detail${path}`, `/api/v1/kanban/task-detail${path}`)

export async function getSurveys(taskId: string): Promise<Survey[]> {
  return apiClient.get<Survey[]>(
    `${base("/surveys")}?taskId=${encodeURIComponent(taskId)}`,
  )
}

export async function getEvaluationFiles(taskId: string): Promise<EvaluationFile[]> {
  return apiClient.get<EvaluationFile[]>(
    `${base("/files")}?taskId=${encodeURIComponent(taskId)}`,
  )
}

export async function getViewTogetherFixedFiles(): Promise<EvaluationFile[]> {
  return apiClient.get<EvaluationFile[]>(base("/view-together-files"))
}

export async function getBusinessEvaluationTemplate(
  taskId: string,
): Promise<BusinessEvaluationTemplate> {
  return apiClient.get<BusinessEvaluationTemplate>(
    `${base("/evaluation/template")}?taskId=${encodeURIComponent(taskId)}`,
  )
}

export async function getBusinessEvaluation(
  taskId: string,
): Promise<BusinessEvaluationData> {
  return apiClient.get<BusinessEvaluationData>(
    `${base("/evaluation")}?taskId=${encodeURIComponent(taskId)}`,
  )
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
  return apiClient.get<BusinessPlanDocument>(
    `${base("/business-plan")}?taskId=${encodeURIComponent(taskId)}`,
  )
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
