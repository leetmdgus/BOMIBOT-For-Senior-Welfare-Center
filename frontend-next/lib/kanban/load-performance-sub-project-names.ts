import {
  collectPerformanceSubProjectNames,
  mergeEvaluationDetailRowsFromPerformance,
  mergePlanSubProjectsFromPerformance,
} from "@/lib/kanban/sync-plan-sub-projects"
import {
  derivePlanSummaryFromInputRows,
  derivePlanTotalsBySubProject,
  fillEmptyPlanSummary,
  fillSubProjectOutputsFromPerformance,
} from "@/lib/kanban/plan-summary-from-performance"
import {
  getInputManagementRows,
  getPerformanceInputMeta,
} from "@/services/kanban.performance.service"
import type {
  BusinessPlanFormData,
  BusinessPlanSubProject,
} from "@/services/kanban.task-detail.types"
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

/**
 * 실적관리(입력관리) 1회 로드로 사업계획 폼을 동기화한다.
 * - 세부사업명: 실적관리 세목 기준으로 정렬·보강
 * - 연인원수/횟수·소요예산·예산과목: 실적관리 '계획' 합계에서 도출(빈칸일 때만 채움)
 * - 담당: 칸반 카드 담당자(managerLabel)로 채움(빈칸일 때만)
 */
export async function syncPlanFormFromPerformance(
  taskId: string,
  form: BusinessPlanFormData,
  managerLabel: string,
): Promise<BusinessPlanFormData> {
  const [meta, rows] = await Promise.all([
    getPerformanceInputMeta(),
    getInputManagementRows(taskId),
  ])

  const names = collectPerformanceSubProjectNames(meta.subProjectChips, rows)
  const merged = mergePlanSubProjectsFromPerformance(form.subProjects, names)
  // 산출목표 헤드라인(세부사업명·연인원/횟수)을 실적관리 '계획' 합계로 채움(불릿은 보존)
  const subProjects = fillSubProjectOutputsFromPerformance(
    merged,
    derivePlanTotalsBySubProject(rows),
  )
  const derived = derivePlanSummaryFromInputRows(rows)

  return fillEmptyPlanSummary({ ...form, subProjects }, derived, managerLabel)
}

export async function syncEvaluationDetailRowsFromPerformance(
  taskId: string,
  existing: EvaluationDetailRow[],
): Promise<EvaluationDetailRow[]> {
  const names = await loadPerformanceSubProjectNames(taskId)
  return mergeEvaluationDetailRowsFromPerformance(existing, names)
}
