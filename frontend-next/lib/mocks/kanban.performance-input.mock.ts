import { summaryRowsToInputRows } from "@menu/kanban/components/task-detail/performance/input-rows-to-summary"
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
  ["신규회원 이용상담", "홍보", "1월", 0, 1, 0, 0, 1, 0],
  ["신규회원 이용상담", "설문조사", "1월", 3000, 1, 50000, 3481, 1, 50000],
  ["신규회원 이용상담", "홍보", "2월", 0, 1, 0, 0, 1, 0],
  ["신규회원 이용상담", "설문조사", "2월", 3000, 1, 50000, 3396, 1, 50000],
  ["신규회원 이용상담", "홍보", "3월", 0, 1, 0, 0, 1, 0],
  ["신규회원 이용상담", "설문조사", "3월", 3000, 1, 50000, 3457, 1, 50000],
  ["신규회원 이용상담", "홍보", "4월", 0, 1, 0, 0, 1, 0],
  ["신규회원 이용상담", "설문조사", "4월", 3000, 1, 50000, 3410, 1, 50000],
  ["신규회원 이용상담", "홍보", "5월", 0, 1, 0, 0, 1, 0],
  ["신규회원 이용상담", "설문조사", "5월", 3000, 1, 50000, 3512, 1, 50000],
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

// 세세목(상세분류) 기본 등록분 없음 — 필요 시 표에서 직접 입력/추가한다.
export const defaultDetailCategories: string[] = []

export interface PerformanceSubProjectChip {
  id: number
  label: string
  color: string
}

/** 입력관리 세목(세부사업명) 칩 목록 — 기본 등록분 없음(필요 시 직접 추가) */
export const performanceSubProjectChips: PerformanceSubProjectChip[] = []
