import {
  collectPerformanceSubProjectNames,
  mergeEvaluationDetailRowsFromPerformance,
  mergePlanSubProjectsFromPerformance,
} from "@/lib/kanban/sync-plan-sub-projects"
import {
  getInputManagementRows,
  getPerformanceInputMeta,
} from "@/services/kanban.performance.service"
import type { BusinessPlanSubProject } from "@/services/kanban.task-detail.types"
import type { EvaluationDetailRow } from "@/services/kanban.task-detail.types"

/** 실적 입력관리(세부사업명 칩·행) 기준 세부사업명 목록 */
export async function loadPerformanceSubProjectNames(
  taskId: string,
): Promise<string[]> {
  const [meta, rows] = await Promise.all([
    getPerformanceInputMeta(),
    getInputManagementRows(taskId),
  ])
  return collectPerformanceSubProjectNames(meta.subProjectChips, rows)
}

export async function syncPlanSubProjectsFromPerformance(
  taskId: string,
  existing: BusinessPlanSubProject[],
): Promise<BusinessPlanSubProject[]> {
  const names = await loadPerformanceSubProjectNames(taskId)
  return mergePlanSubProjectsFromPerformance(existing, names)
}

export async function syncEvaluationDetailRowsFromPerformance(
  taskId: string,
  existing: EvaluationDetailRow[],
): Promise<EvaluationDetailRow[]> {
  const names = await loadPerformanceSubProjectNames(taskId)
  return mergeEvaluationDetailRowsFromPerformance(existing, names)
}
