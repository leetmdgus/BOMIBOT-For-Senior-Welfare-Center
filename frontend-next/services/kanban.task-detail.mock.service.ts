import { advanceTaskToNextProcess } from "@/lib/mocks/kanban.board.mock"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import {
  bootstrapBusinessPlan,
  bootstrapEvaluation,
  bootstrapTaskSurveys,
} from "@/lib/kanban/task-detail-bootstrap"
import {
  normalizeTaskId,
  resolveKanbanCardTitle,
} from "@/lib/kanban/resolve-card-title"
import type {
  BusinessEvaluationData,
  BusinessEvaluationTemplate,
  BusinessPlanDocument,
  EvaluationFile,
  SaveBusinessEvaluationPayload,
  SaveBusinessPlanPayload,
  Survey,
} from "./kanban.task-detail.types"

type TaskDetailRuntime = {
  evaluationByTaskId: Map<string, BusinessEvaluationData>
  businessPlanByTaskId: Map<string, BusinessPlanDocument>
  surveysByTaskId: Map<string, Survey[]>
}

const runtimeByRegion = new Map<RegionId, TaskDetailRuntime>()

async function getTaskDetailRuntime(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  let runtime = runtimeByRegion.get(store.regionId)

  if (!runtime) {
    runtime = {
      evaluationByTaskId: new Map(),
      businessPlanByTaskId: new Map(),
      surveysByTaskId: new Map(),
    }
    runtimeByRegion.set(store.regionId, runtime)
  }

  return { store, runtime }
}

function tid(taskId: string) {
  return normalizeTaskId(taskId)
}

function cloneEvaluation(source: BusinessEvaluationData): BusinessEvaluationData {
  return {
    ...source,
    goals: [...source.goals],
    detailRows: source.detailRows.map((row) => ({ ...row })),
    sections: source.sections.map((section) => ({ ...section })),
  }
}

async function resolveCardTitle(
  taskId: string,
  regionId?: RegionId,
): Promise<string | null> {
  const { store } = await getTaskDetailRuntime(regionId)
  return resolveKanbanCardTitle(taskId, store.kanban.projectsMock)
}

async function getOrCreateEvaluation(
  taskId: string,
  regionId?: RegionId,
): Promise<BusinessEvaluationData> {
  const { store, runtime } = await getTaskDetailRuntime(regionId)
  const key = tid(taskId)
  const existing = runtime.evaluationByTaskId.get(key)
  if (existing) return existing

  const cardTitle = await resolveCardTitle(taskId, regionId)
  const created = bootstrapEvaluation(
    store.taskDetail.businessEvaluationData,
    key,
    cardTitle,
  )
  runtime.evaluationByTaskId.set(key, created)
  return created
}

function surveyCatalogFromStore(store: Awaited<ReturnType<typeof loadRegionStore>>) {
  return store.survey.surveyListItemsMock.map((item) => ({
    id: item.id,
    title: item.title,
    program: item.program,
    date: item.date,
    status: item.status,
    endDate: item.endDate,
  }))
}

async function getOrCreateTaskSurveys(
  taskId: string,
  regionId?: RegionId,
): Promise<Survey[]> {
  const { store, runtime } = await getTaskDetailRuntime(regionId)
  const key = tid(taskId)
  const existing = runtime.surveysByTaskId.get(key)
  if (existing) return existing

  const cardTitle = await resolveCardTitle(taskId, regionId)
  const created = bootstrapTaskSurveys(
    surveyCatalogFromStore(store),
    key,
    cardTitle,
  )
  runtime.surveysByTaskId.set(key, created)
  return created
}

export async function getSurveys(
  taskId: string,
  regionId?: RegionId,
): Promise<Survey[]> {
  return [...(await getOrCreateTaskSurveys(taskId, regionId))]
}

export async function getEvaluationFiles(
  _taskId: string,
  regionId?: RegionId,
): Promise<EvaluationFile[]> {
  const { store } = await getTaskDetailRuntime(regionId)
  return store.taskDetail.filesData
}

export async function getViewTogetherFixedFiles(
  regionId?: RegionId,
): Promise<EvaluationFile[]> {
  const { store } = await getTaskDetailRuntime(regionId)
  return [...store.taskDetail.viewTogetherFixedFiles]
}

function cloneEvaluationTemplate(
  source: BusinessEvaluationData,
): BusinessEvaluationTemplate {
  return {
    performanceIndicator: source.performanceIndicator,
    evaluationTool: source.evaluationTool,
    keyFactorAnalysis: source.keyFactorAnalysis,
    goalAppropriacy: source.goalAppropriacy,
    suggestion: source.suggestion,
    detailRows: source.detailRows.map((row) => ({ ...row })),
    sections: source.sections.map((section) => ({ ...section })),
  }
}

export async function getBusinessEvaluationTemplate(
  taskId: string,
  regionId?: RegionId,
): Promise<BusinessEvaluationTemplate> {
  const evaluation = await getOrCreateEvaluation(taskId, regionId)
  return cloneEvaluationTemplate(evaluation)
}

export async function getBusinessEvaluation(
  taskId: string,
  regionId?: RegionId,
): Promise<BusinessEvaluationData> {
  return cloneEvaluation(await getOrCreateEvaluation(taskId, regionId))
}

export async function saveBusinessEvaluation(
  taskId: string,
  payload: SaveBusinessEvaluationPayload,
  regionId?: RegionId,
): Promise<BusinessEvaluationData> {
  const { runtime } = await getTaskDetailRuntime(regionId)
  const key = tid(taskId)
  const current = await getOrCreateEvaluation(taskId, regionId)
  const next: BusinessEvaluationData = {
    ...current,
    ...payload,
    goals: payload.goals ? [...payload.goals] : current.goals,
    detailRows: payload.detailRows
      ? payload.detailRows.map((row) => ({ ...row }))
      : current.detailRows,
    sections: payload.sections
      ? payload.sections.map((section) => ({ ...section }))
      : current.sections,
  }

  runtime.evaluationByTaskId.set(key, next)
  return cloneEvaluation(next)
}

export async function completeBusinessEvaluation(
  taskId: string,
  regionId?: RegionId,
): Promise<BusinessEvaluationData> {
  const { store, runtime } = await getTaskDetailRuntime(regionId)
  const key = tid(taskId)
  advanceTaskToNextProcess(taskId, store.kanban.projectsMock)

  const current = await getOrCreateEvaluation(taskId, regionId)
  const next: BusinessEvaluationData = {
    ...current,
    isCompleted: true,
  }

  runtime.evaluationByTaskId.set(key, next)
  return cloneEvaluation(next)
}

function cloneBusinessPlan(source: BusinessPlanDocument): BusinessPlanDocument {
  return {
    isCompleted: source.isCompleted,
    formData: {
      ...source.formData,
      goals: [...source.formData.goals],
      subProjects: source.formData.subProjects.map((item) => ({ ...item })),
    },
    sections: source.sections.map((section) => ({ ...section })),
  }
}

async function getOrCreateBusinessPlan(
  taskId: string,
  regionId?: RegionId,
): Promise<BusinessPlanDocument> {
  const { store, runtime } = await getTaskDetailRuntime(regionId)
  const key = tid(taskId)
  const existing = runtime.businessPlanByTaskId.get(key)
  if (existing) return existing

  const cardTitle = await resolveCardTitle(taskId, regionId)
  const created = bootstrapBusinessPlan(
    store.businessPlan.defaultBusinessPlanDocument,
    key,
    cardTitle,
  )
  runtime.businessPlanByTaskId.set(key, created)
  return created
}

export async function getBusinessPlan(
  taskId: string,
  regionId?: RegionId,
): Promise<BusinessPlanDocument> {
  return cloneBusinessPlan(await getOrCreateBusinessPlan(taskId, regionId))
}

export async function saveBusinessPlan(
  taskId: string,
  payload: SaveBusinessPlanPayload,
  regionId?: RegionId,
): Promise<BusinessPlanDocument> {
  const { runtime } = await getTaskDetailRuntime(regionId)
  const key = tid(taskId)
  const current = await getOrCreateBusinessPlan(taskId, regionId)
  const next: BusinessPlanDocument = {
    isCompleted:
      payload.isCompleted !== undefined
        ? payload.isCompleted
        : current.isCompleted,
    formData: payload.formData
      ? {
          ...payload.formData,
          goals: [...payload.formData.goals],
          subProjects: payload.formData.subProjects.map((item) => ({
            ...item,
          })),
        }
      : current.formData,
    sections: payload.sections
      ? payload.sections.map((section) => ({ ...section }))
      : current.sections,
  }

  runtime.businessPlanByTaskId.set(key, next)
  return cloneBusinessPlan(next)
}
