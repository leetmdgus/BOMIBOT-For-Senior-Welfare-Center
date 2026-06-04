import type { PerformanceRow } from "@/services/kanban.performance.types"
import { getInputManagementRows } from "@/services/kanban.performance.service"

import { computeInputTotals } from "./input-rows-to-summary"

/** 사업평가 요약 표의 계획/실행 인원·예산·지출 (실적관리 파생값) */
export type EvaluationPerformanceTotals = {
  planCount: string
  planBudget: string
  actualCount: string
  actualExpense: string
}

function formatPeopleCount(people: number, count: number): string {
  return `${people.toLocaleString()}명 / ${count.toLocaleString()}회`
}

/** 실적관리(계획/실적 입력관리) 합계 → 사업평가 요약 표 문자열 */
export function evaluationTotalsFromInputRows(
  rows: PerformanceRow[],
): EvaluationPerformanceTotals {
  const totals = computeInputTotals(rows)
  return {
    planCount: formatPeopleCount(totals.planPeople, totals.planCount),
    planBudget: totals.planBudget.toLocaleString(),
    actualCount: formatPeopleCount(totals.actualPeople, totals.actualCount),
    actualExpense: totals.actualExpense.toLocaleString(),
  }
}

/** taskId 기준 실적관리 합계를 불러와 사업평가 요약 값으로 변환 */
export async function loadEvaluationPerformanceTotals(
  taskId: string,
): Promise<EvaluationPerformanceTotals> {
  const rows = await getInputManagementRows(taskId)
  return evaluationTotalsFromInputRows(rows)
}
