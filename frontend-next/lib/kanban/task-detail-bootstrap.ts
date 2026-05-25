import type {
  BusinessEvaluationData,
  BusinessPlanDocument,
  Survey,
} from "@/services/kanban.task-detail.types"
import { businessNameForTask, normalizeTaskId } from "@/lib/kanban/resolve-card-title"

const TASK_SURVEY_IDS: Record<string, string[]> = {
  task1: ["1"],
  task2: ["3"],
  task3: ["3"],
  task4: ["4"],
  task5: ["2"],
  task6: ["5"],
}

export function bootstrapEvaluation(
  source: BusinessEvaluationData,
  taskId: string,
  cardTitle?: string | null,
): BusinessEvaluationData {
  const title = businessNameForTask(taskId, cardTitle)
  const next: BusinessEvaluationData = {
    ...source,
    goals: [...source.goals],
    detailRows: source.detailRows.map((row) => ({ ...row })),
    sections: source.sections.map((section) => ({ ...section })),
    programName: title,
    performanceIndicator: `${title} 핵심 성과지표`,
    evaluationTool: `${title} 만족도·성과 설문`,
    keyFactorAnalysis: `${title} 추진 시 핵심 요인 분석`,
    goalAppropriacy: `${title} 목표 적절성 검토`,
    suggestion: `${title} 차년도 개선·확대 제안`,
  }
  if (next.detailRows[0]) {
    next.detailRows[0] = {
      ...next.detailRows[0],
      content: `${title} 관련 ${next.detailRows[0].label}`,
    }
  }
  return next
}

export function bootstrapBusinessPlan(
  source: BusinessPlanDocument,
  taskId: string,
  cardTitle?: string | null,
): BusinessPlanDocument {
  const title = businessNameForTask(taskId, cardTitle)
  return {
    ...source,
    formData: {
      ...source.formData,
      goals: [...source.formData.goals],
      subProjects: source.formData.subProjects.map((item) => ({ ...item })),
      projectName: title,
      purpose: `${title} 대상자에게 맞춤형 서비스를 제공하고 사업 목표 달성을 위한 연간 추진 계획`,
      goals: source.formData.goals.map((_, index) => `${title} 목표 ${index + 1}`),
    },
    sections: source.sections.map((section) => ({ ...section })),
  }
}

export function bootstrapTaskSurveys(
  catalog: Survey[],
  taskId: string,
  cardTitle?: string | null,
): Survey[] {
  const tid = normalizeTaskId(taskId)
  const title = businessNameForTask(taskId, cardTitle)
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const seedIds = TASK_SURVEY_IDS[tid] ?? []

  const rows = seedIds
    .map((id) => byId.get(id))
    .filter((item): item is Survey => Boolean(item))
    .map((item) => ({
      ...item,
      program: title,
      title: seedIds.length === 1 ? `${title} 만족도 조사` : item.title,
    }))

  if (rows.length > 0) return rows

  return [
    {
      id: `survey-${tid}-1`,
      title: `${title} 만족도 조사`,
      program: title,
      date: "",
      status: "예정",
      endDate: "",
    },
  ]
}
