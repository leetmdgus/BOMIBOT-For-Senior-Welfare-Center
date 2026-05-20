export type PerformanceFundingSource =
  | "경"
  | "기"
  | "비"
  | "지"
  | "법"
  | "사"
  | "잡"

/** 원천별 금액 (계획 예산 / 실적 지출) */
export interface PerformanceFundingEntry {
  source: PerformanceFundingSource
  amount: number
}

export interface PerformanceSummaryMetrics {
  people: number
  count: number
  budget: number
}

/** 계획/실적 입력관리 행 (단일 데이터 소스) */
export interface PerformanceRow {
  id: string
  selected: boolean
  subProject: string
  detailCategory: string
  month: string
  planPeople: number
  planCount: number
  planBudget: number
  actualPeople: number
  actualCount: number
  actualExpense: number
  content: string
  fundingSources?: PerformanceFundingSource[]
  planFunding?: PerformanceFundingEntry[]
  actualFunding?: PerformanceFundingEntry[]
}

/** 사업계획·사업실적·사업결과 탭 집계 행 */
export interface PerformanceSummaryRow {
  id: string
  subProject: string
  detailCategory: string
  fundingSources: PerformanceFundingSource[]
  plan: {
    total: PerformanceSummaryMetrics
    monthly: Record<string, PerformanceSummaryMetrics>
  }
  actual: {
    total: PerformanceSummaryMetrics
    monthly: Record<string, PerformanceSummaryMetrics>
  }
}

export interface PerformanceSubProjectChip {
  id: number
  label: string
  color: string
}

export interface PerformanceInputMeta {
  subProjectChips: PerformanceSubProjectChip[]
  detailCategories: string[]
}

export interface PerformanceListResponse {
  data: PerformanceRow[]
  totals: {
    planPeople: number
    planCount: number
    planBudget: number
    actualPeople: number
    actualCount: number
  }
  count: number
}

export type MonthlyPlanVersion = "기본계획" | "1차추경" | "2차추경"

export interface MonthlyPlanCell {
  people: number
  count: number
  budget: number
}

export interface MonthlyPlanRow {
  id: string
  name: string
  totalPeople: number
  totalCount: number
  totalBudget: number
  monthly: Record<string, MonthlyPlanCell>
}

export interface MonthlyPlanData {
  version: MonthlyPlanVersion
  rows: MonthlyPlanRow[]
}

export interface MonthlyPlanResponse {
  months: string[]
  data: MonthlyPlanData
}
