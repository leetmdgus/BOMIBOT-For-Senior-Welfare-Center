import type { PerformanceRow } from "@/services/kanban.performance.types"
import {
  taskPerformanceSeedIndex,
  taskPerformanceSeedMonth,
} from "@/lib/kanban/task-performance-seed"

import { inputManagementRows } from "./kanban.performance-input.mock"

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

function cloneRows(rows: PerformanceRow[], taskId: string): PerformanceRow[] {
  return rows.map((row) => ({
    ...structuredClone(row),
    id: createId(),
    taskId,
  }))
}

function seedRow(
  taskId: string,
  subProject: string,
  partial: Partial<PerformanceRow>,
): PerformanceRow {
  return {
    id: createId(),
    selected: false,
    subProject,
    detailCategory: "프로그램진행",
    month: "1월",
    planPeople: 0,
    planCount: 0,
    planBudget: 0,
    actualPeople: 0,
    actualCount: 0,
    actualExpense: 0,
    content: "",
    taskId,
    ...partial,
  }
}

const TASK5_ROWS: PerformanceRow[] = [
  seedRow("task5", "취미여가지원사업", {
    detailCategory: "프로그램진행",
    month: "4월",
    planPeople: 30,
    planCount: 4,
    planBudget: 1200000,
    actualPeople: 28,
    actualCount: 4,
    actualExpense: 1150000,
    content: "스마트폰 활용 교육",
  }),
  seedRow("task5", "취미여가지원사업", {
    detailCategory: "홍보",
    month: "3월",
    planCount: 2,
    actualCount: 2,
    content: "교육 일정 안내 게시",
  }),
]

const TASK_BOOTSTRAP: Record<string, PerformanceRow[] | "legacy"> = {
  task2: "legacy",
  task5: TASK5_ROWS,
}

export function bootstrapInputRowsForTask(
  taskId: string,
  legacyRows: PerformanceRow[],
): PerformanceRow[] {
  const preset = TASK_BOOTSTRAP[taskId]
  if (preset === "legacy") {
    return cloneRows(legacyRows, taskId)
  }
  if (preset) {
    return preset.map((row) => ({ ...structuredClone(row), id: createId() }))
  }

  const titles: Record<string, string> = {
    task1: "일반상담 및 정보제공사업",
    task3: "이용자관리 및 이용자권리증진사업",
    task4: "평생교육지원사업",
    task6: "문화예술지원사업",
  }
  const title = titles[taskId] ?? taskId
  const monthByTask: Record<string, string> = {
    task1: "2월",
    task3: "6월",
    task4: "9월",
    task6: "7월",
  }
  const digit = taskPerformanceSeedIndex(taskId)

  return [
    seedRow(taskId, title, {
      month: monthByTask[taskId] ?? taskPerformanceSeedMonth(taskId),
      planPeople: digit * 10,
      planCount: digit * 2,
      planBudget: digit * 50000,
      actualPeople: Math.max(0, digit * 10 - 2),
      actualCount: digit * 2,
      actualExpense: digit * 48000,
      content: `${title} 실적`,
    }),
  ]
}

/** mock 전용: 업무별 입력관리 캐시 */
export const inputManagementByTaskId: Record<string, PerformanceRow[]> = {}

export function getMockInputRowsForTask(
  taskId: string,
  legacyRows: PerformanceRow[] = inputManagementRows,
): PerformanceRow[] {
  if (inputManagementByTaskId[taskId]) {
    return structuredClone(inputManagementByTaskId[taskId])
  }
  const rows = bootstrapInputRowsForTask(taskId, legacyRows)
  inputManagementByTaskId[taskId] = rows
  return structuredClone(rows)
}

export function saveMockInputRowsForTask(
  taskId: string,
  rows: PerformanceRow[],
): void {
  inputManagementByTaskId[taskId] = structuredClone(rows)
}
