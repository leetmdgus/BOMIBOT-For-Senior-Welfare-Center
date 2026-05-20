import {
  advanceTaskToNextProcess,
} from "@/lib/mocks/kanban.board.mock"
import { defaultBusinessPlanDocument } from "@/lib/mocks/kanban.business-plan.mock"
import {
  businessEvaluationData,
  filesData,
  viewTogetherFixedFiles,
} from "@/lib/mocks/kanban.task-detail.mock"
import { surveyListItemsMock } from "@/lib/mocks/survey.mock"
import type {
  BusinessEvaluationData,
  BusinessPlanDocument,
  EvaluationFile,
  SaveBusinessEvaluationPayload,
  SaveBusinessPlanPayload,
  Survey,
} from "./kanban.task-detail.types"

const evaluationByTaskId = new Map<string, BusinessEvaluationData>()
const businessPlanByTaskId = new Map<string, BusinessPlanDocument>()

function cloneEvaluation(
  source: BusinessEvaluationData
): BusinessEvaluationData {
  return {
    ...source,
    goals: [...source.goals],
    detailRows: source.detailRows.map((row) => ({ ...row })),
    sections: source.sections.map((section) => ({ ...section })),
  }
}

function getOrCreateEvaluation(taskId: string): BusinessEvaluationData {
  const existing = evaluationByTaskId.get(taskId)
  if (existing) return existing

  const created = cloneEvaluation({
    ...businessEvaluationData,
    evaluationDate: businessEvaluationData.evaluationDate,
  })
  evaluationByTaskId.set(taskId, created)
  return created
}

export async function getSurveys(): Promise<Survey[]> {
  return surveyListItemsMock.map((item) => ({
    id: item.id,
    title: item.title,
    program: item.program,
    date: item.date,
    status: item.status,
    endDate: item.endDate,
  }))
}

export async function getEvaluationFiles(
  _taskId?: string
): Promise<EvaluationFile[]> {
  return filesData
}

export function getViewTogetherFixedFiles(): EvaluationFile[] {
  return viewTogetherFixedFiles
}

export async function getBusinessEvaluation(
  taskId: string
): Promise<BusinessEvaluationData> {
  return cloneEvaluation(getOrCreateEvaluation(taskId))
}

export async function saveBusinessEvaluation(
  taskId: string,
  payload: SaveBusinessEvaluationPayload
): Promise<BusinessEvaluationData> {
  const current = getOrCreateEvaluation(taskId)
  const next: BusinessEvaluationData = {
    ...current,
    ...payload,
    goals: current.goals,
    detailRows: payload.detailRows ?? current.detailRows,
    sections: payload.sections ?? current.sections,
  }

  evaluationByTaskId.set(taskId, next)
  return cloneEvaluation(next)
}

export async function completeBusinessEvaluation(
  taskId: string
): Promise<BusinessEvaluationData> {
  advanceTaskToNextProcess(taskId)

  const current = getOrCreateEvaluation(taskId)
  const next: BusinessEvaluationData = {
    ...current,
    isCompleted: true,
  }

  evaluationByTaskId.set(taskId, next)
  return cloneEvaluation(next)
}

function cloneBusinessPlan(source: BusinessPlanDocument): BusinessPlanDocument {
  return {
    formData: {
      ...source.formData,
      goals: [...source.formData.goals],
      subProjects: source.formData.subProjects.map((item) => ({ ...item })),
    },
    sections: source.sections.map((section) => ({ ...section })),
  }
}

function getOrCreateBusinessPlan(taskId: string): BusinessPlanDocument {
  const existing = businessPlanByTaskId.get(taskId)
  if (existing) return existing

  const created = cloneBusinessPlan(defaultBusinessPlanDocument)
  businessPlanByTaskId.set(taskId, created)
  return created
}

export async function getBusinessPlan(
  taskId: string
): Promise<BusinessPlanDocument> {
  return cloneBusinessPlan(getOrCreateBusinessPlan(taskId))
}

export async function saveBusinessPlan(
  taskId: string,
  payload: SaveBusinessPlanPayload
): Promise<BusinessPlanDocument> {
  const current = getOrCreateBusinessPlan(taskId)
  const next: BusinessPlanDocument = {
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

  businessPlanByTaskId.set(taskId, next)
  return cloneBusinessPlan(next)
}
