import type {
  BusinessEvaluationData,
  BusinessPlanFormData,
} from "@/services/kanban.task-detail.types"

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

/**
 * 사업평가 요약의 공통 헤더 필드를 비어 있을 때만 자동으로 채운다(사용자 입력 보존).
 * - 사업팀·담당자: 칸반 카드(팀·담당자)
 * - 프로그램명·사업기간·대상·목적·목표: 사업계획서(formData)
 * (계획/실행 인원·예산·지출은 실적관리 합계에서 별도 반영)
 */
export function fillEvaluationCommonFields(
  evaluation: BusinessEvaluationData,
  planForm: Partial<BusinessPlanFormData> | null | undefined,
  card: { team: string; manager: string },
): BusinessEvaluationData {
  const plan = planForm ?? {}
  const planGoals = plan.goals ?? []

  return {
    ...evaluation,
    programName:
      isBlank(evaluation.programName) && !isBlank(plan.projectName)
        ? (plan.projectName as string)
        : evaluation.programName,
    team: isBlank(evaluation.team) ? card.team : evaluation.team,
    manager: isBlank(evaluation.manager)
      ? card.manager || plan.manager || ""
      : evaluation.manager,
    period: isBlank(evaluation.period) ? plan.period ?? "" : evaluation.period,
    target: isBlank(evaluation.target) ? plan.target ?? "" : evaluation.target,
    purpose: isBlank(evaluation.purpose) ? plan.purpose ?? "" : evaluation.purpose,
    goals:
      evaluation.goals && evaluation.goals.length > 0
        ? evaluation.goals
        : [...planGoals],
  }
}
