import { summaryRowsToInputRows } from "@/components/kanban/task-detail/performance/input-rows-to-summary"
import type { PerformanceRow } from "@/services/kanban.performance.types"

import { performanceSummarySeedRows } from "./kanban.performance-summary.mock"

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

const rawRows: Array<
  [string, string, string, number, number, number, number, number, number]
> = [
  ["선택", "기타", "4월", 0, 0, 0, 199, 24, 898100],
  ["온라인홍보", "웹매거진", "1월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "SNS게시", "1월", 3000, 1, 50000, 3481, 1, 50000],
  ["온라인홍보", "웹매거진", "2월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "SNS게시", "2월", 3000, 1, 50000, 3396, 1, 50000],
  ["온라인홍보", "웹매거진", "3월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "SNS게시", "3월", 3000, 1, 50000, 3457, 1, 50000],
  ["온라인홍보", "웹매거진", "4월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "SNS게시", "4월", 3000, 1, 50000, 3410, 1, 50000],
  ["온라인홍보", "웹매거진", "5월", 0, 1, 0, 0, 1, 0],
  ["온라인홍보", "SNS게시", "5월", 3000, 1, 50000, 3512, 1, 50000],
  ["선택", "기타", "5월", 0, 0, 0, 210, 26, 920000],
]

const demoRows: PerformanceRow[] = rawRows.map((item, index) => ({
  id: createId(),
  selected: false,
  subProject: item[0],
  detailCategory: item[1],
  month: item[2],
  planPeople: item[3],
  planCount: item[4],
  planBudget: item[5],
  actualPeople: item[6],
  actualCount: item[7],
  actualExpense: item[8],
  content: index % 2 === 0 ? "웹매거진 제작 및 발송" : "온라인 게시물 관리대장",
  fundingSources: item[5] > 0 || item[8] > 0 ? ["비"] : undefined,
  planFunding:
    item[5] > 0 ? [{ source: "비" as const, amount: item[5] }] : undefined,
  actualFunding:
    item[8] > 0 ? [{ source: "비" as const, amount: item[8] }] : undefined,
}))

/** 계획/실적 입력관리 + 사업계획·실적·결과 탭 공통 데이터 */
export const inputManagementRows: PerformanceRow[] = [
  ...demoRows,
  ...summaryRowsToInputRows(performanceSummarySeedRows),
]

export const defaultDetailCategories = [
  "웹매거진",
  "SNS게시",
  "홍보물제작",
  "행사",
  "기타",
]

export interface PerformanceSubProjectChip {
  id: number
  label: string
  color: string
}

/** 입력관리 세목(세부사업명) 칩 목록 */
export const performanceSubProjectChips: PerformanceSubProjectChip[] = [
  { id: 1, label: "온라인홍보", color: "#8fd3ff" },
  { id: 2, label: "오프라인 홍보", color: "#ffe58f" },
  { id: 3, label: "관내 홍보", color: "#ff9c8f" },
]
