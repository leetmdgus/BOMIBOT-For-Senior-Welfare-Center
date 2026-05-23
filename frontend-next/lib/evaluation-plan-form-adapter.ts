import type {
  BusinessEvaluationData,
  BusinessPlanFormData,
  BusinessPlanSubProject,
} from "@/services/kanban.task-detail.types"

/** 평가서 표 블록(목적·목표) 편집용 — 계획서 formData 형태로 변환 */
export function evaluationToPlanFormData(
  evaluation: BusinessEvaluationData,
): BusinessPlanFormData {
  const goals = evaluation.goals?.length
    ? evaluation.goals
    : ["", "", ""]

  const subProjects: BusinessPlanSubProject[] = goals.map((goal, index) => ({
    name: `목표 ${index + 1}`,
    output: goal,
    outcome: "",
  }))

  return {
    projectName: evaluation.programName,
    purpose: evaluation.purpose,
    goals: [...goals],
    period: evaluation.period,
    target: evaluation.target,
    totalCount: evaluation.planCount,
    budget: evaluation.planBudget,
    budgetCategory: "",
    manager: evaluation.manager,
    subProjects,
  }
}

/** 표 블록에서 수정된 plan formData를 평가서 필드에 반영 */
export function applyPlanFormDataToEvaluation(
  evaluation: BusinessEvaluationData,
  formData: BusinessPlanFormData,
): BusinessEvaluationData {
  return {
    ...evaluation,
    programName: formData.projectName || evaluation.programName,
    purpose: formData.purpose,
    goals: formData.subProjects.map((s) => s.output).filter(Boolean).length
      ? formData.subProjects.map((s) => s.output)
      : formData.goals,
    period: formData.period || evaluation.period,
    target: formData.target || evaluation.target,
    planCount: formData.totalCount || evaluation.planCount,
    planBudget: formData.budget || evaluation.planBudget,
    manager: formData.manager || evaluation.manager,
  }
}
