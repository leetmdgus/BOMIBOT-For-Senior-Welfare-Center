export interface PerformanceReportRow {
  majorCategory: string
  projectName: string
  subProjectName: string
  detailCategory: string
  planPeople: number
  actualPeople: number
  /** 연인원 = Σ(인원 × 횟수). 월별 행의 곱의 합(합×합 아님). 백엔드가 채움(mock은 생략 가능). */
  planYearlyPeople?: number
  actualYearlyPeople?: number
  planCount: number
  actualCount: number
  planBudget: number
  rowType?: "data" | "subtotal"
  majorCategoryRowSpan?: number
  projectNameRowSpan?: number
}

export interface BudgetReportRow {
  gwan: string
  hang: string
  mok: string
  budgetCurrent: number
  budgetPrevious: number
  income: number
  subsidy: number
  sponsor: number
  transfer: number
  misc: number
  amount: number
  ratio: string
  rowType?: "total" | "data"
}

export interface BusinessPlanStat {
  label: string
  value: string
  unit?: string
  color: string
}

export interface BusinessPlanItem {
  name: string
  people: number
  count: number
  budget: number
  purpose: string
  target: string
  period: string
  method: string
  evaluation: string
}

export interface BusinessPlanSubtotal {
  people: number
  count: number
  budget: number
  content: string
}

export interface BusinessPlanProject {
  category: string
  subCategory: string
  subtotal: BusinessPlanSubtotal
  items: BusinessPlanItem[]
}

export interface BusinessPlanReport {
  stats: BusinessPlanStat[]
  projects: BusinessPlanProject[]
}

export interface KanbanDocumentsResponse {
  performanceRows: PerformanceReportRow[]
  budgetRows: BudgetReportRow[]
  businessPlan: BusinessPlanReport
}
