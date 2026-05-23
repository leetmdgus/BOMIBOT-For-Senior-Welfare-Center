import type {
  BusinessEvaluationData,
  BusinessEvaluationTemplate,
  BusinessPlanDocument,
  EvaluationFile,
  SaveBusinessEvaluationPayload,
  SaveBusinessPlanPayload,
  Survey,
} from "./kanban.task-detail.types"

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getSurveys(): Promise<Survey[]> {
  return apiFetch<Survey[]>("/api/kanban/task-detail/surveys")
}

export async function getEvaluationFiles(taskId: string): Promise<EvaluationFile[]> {
  return apiFetch<EvaluationFile[]>(
    `/api/kanban/task-detail/files?taskId=${encodeURIComponent(taskId)}`
  )
}

export async function getViewTogetherFixedFiles(): Promise<EvaluationFile[]> {
  return apiFetch<EvaluationFile[]>("/api/kanban/task-detail/view-together-files")
}

export async function getBusinessEvaluationTemplate(
  taskId: string,
): Promise<BusinessEvaluationTemplate> {
  return apiFetch<BusinessEvaluationTemplate>(
    `/api/kanban/task-detail/evaluation/template?taskId=${encodeURIComponent(taskId)}`,
  )
}

export async function getBusinessEvaluation(
  taskId: string
): Promise<BusinessEvaluationData> {
  return apiFetch<BusinessEvaluationData>(
    `/api/kanban/task-detail/evaluation?taskId=${encodeURIComponent(taskId)}`
  )
}

export async function saveBusinessEvaluation(
  taskId: string,
  payload: SaveBusinessEvaluationPayload
): Promise<BusinessEvaluationData> {
  return apiFetch<BusinessEvaluationData>("/api/kanban/task-detail/evaluation", {
    method: "PATCH",
    body: JSON.stringify({ taskId, ...payload }),
  })
}

export async function completeBusinessEvaluation(
  taskId: string
): Promise<BusinessEvaluationData> {
  return apiFetch<BusinessEvaluationData>(
    "/api/kanban/task-detail/evaluation/complete",
    {
      method: "POST",
      body: JSON.stringify({ taskId }),
    }
  )
}

export async function getBusinessPlan(
  taskId: string
): Promise<BusinessPlanDocument> {
  return apiFetch<BusinessPlanDocument>(
    `/api/kanban/task-detail/business-plan?taskId=${encodeURIComponent(taskId)}`
  )
}

export async function saveBusinessPlan(
  taskId: string,
  payload: SaveBusinessPlanPayload
): Promise<BusinessPlanDocument> {
  return apiFetch<BusinessPlanDocument>("/api/kanban/task-detail/business-plan", {
    method: "PATCH",
    body: JSON.stringify({ taskId, ...payload }),
  })
}
