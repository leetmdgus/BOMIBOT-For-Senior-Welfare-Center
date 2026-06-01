import type {
  BusinessEvaluationData,
  SaveBusinessEvaluationPayload,
} from "@/services/kanban.task-detail.types"

/** 평가서 UI 상태 → PATCH payload (요약·본문 필드 전체) */
export function toSaveBusinessEvaluationPayload(
  evaluation: BusinessEvaluationData,
): SaveBusinessEvaluationPayload {
  return {
    team: evaluation.team,
    manager: evaluation.manager,
    period: evaluation.period,
    programName: evaluation.programName,
    target: evaluation.target,
    planCount: evaluation.planCount,
    planBudget: evaluation.planBudget,
    actualCount: evaluation.actualCount,
    actualExpense: evaluation.actualExpense,
    evaluationDate: evaluation.evaluationDate,
    purpose: evaluation.purpose,
    goals: evaluation.goals.filter(Boolean),
    performanceIndicator: evaluation.performanceIndicator,
    evaluationTool: evaluation.evaluationTool,
    supervision: evaluation.supervision,
    detailRows: [],
    sections: evaluation.sections,
    keyFactorAnalysis: evaluation.keyFactorAnalysis,
    goalAppropriacy: evaluation.goalAppropriacy,
    suggestion: evaluation.suggestion,
  }
}
