import type {
  PerformanceRow,
  PerformanceSummaryMetrics,
  PerformanceSummaryRow,
} from "@/services/kanban.performance.types"

import { DISPLAY_MONTHS } from "./performance-summary.constants"
import { collectFundingSources } from "./performance-funding.utils"

type Metrics = PerformanceSummaryMetrics

function emptyMetrics(): Metrics {
  return { people: 0, count: 0, budget: 0 }
}

function emptyMonthly(): Record<string, Metrics> {
  return Object.fromEntries(
    DISPLAY_MONTHS.map((month) => [month, emptyMetrics()]),
  ) as Record<string, Metrics>
}

function mergeMetrics(a: Metrics, b: Metrics): Metrics {
  return {
    people: a.people + b.people,
    count: a.count + b.count,
    budget: a.budget + b.budget,
  }
}

function hasMetrics(metrics: Metrics) {
  return metrics.people > 0 || metrics.count > 0 || metrics.budget > 0
}

export function normalizeDetailCategory(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "—" || trimmed === "--") return ""
  return trimmed
}

function isInputRowCountable(row: PerformanceRow) {
  return Boolean(row.subProject) && row.subProject !== "선택"
}

/** 입력관리 행 → 사업계획/실적/결과 집계 (단일 변환 규칙) */
export function inputRowsToSummaryRows(
  rows: PerformanceRow[],
): PerformanceSummaryRow[] {
  const grouped = new Map<string, PerformanceSummaryRow>()

  rows.forEach((row) => {
    if (!isInputRowCountable(row)) return

    const detailCategory = normalizeDetailCategory(row.detailCategory)
    const key = `${row.subProject}::${detailCategory}`
    const month = row.month

    if (!DISPLAY_MONTHS.includes(month as (typeof DISPLAY_MONTHS)[number])) {
      return
    }

    let summary = grouped.get(key)
    const rowFundingSources = collectFundingSources(row)

    if (!summary) {
      summary = {
        id: key,
        subProject: row.subProject,
        detailCategory,
        fundingSources: rowFundingSources.length ? rowFundingSources : ["비"],
        plan: { total: emptyMetrics(), monthly: emptyMonthly() },
        actual: { total: emptyMetrics(), monthly: emptyMonthly() },
      }
      grouped.set(key, summary)
    } else if (rowFundingSources.length) {
      summary.fundingSources = [
        ...new Set([...summary.fundingSources, ...rowFundingSources]),
      ]
    }

    const planCell: Metrics = {
      people: row.planPeople,
      count: row.planCount,
      budget: row.planBudget,
    }
    const actualCell: Metrics = {
      people: row.actualPeople,
      count: row.actualCount,
      budget: row.actualExpense,
    }

    summary.plan.monthly[month] = mergeMetrics(
      summary.plan.monthly[month] ?? emptyMetrics(),
      planCell,
    )
    summary.actual.monthly[month] = mergeMetrics(
      summary.actual.monthly[month] ?? emptyMetrics(),
      actualCell,
    )
    summary.plan.total = mergeMetrics(summary.plan.total, planCell)
    summary.actual.total = mergeMetrics(summary.actual.total, actualCell)
  })

  return Array.from(grouped.values())
}

/** 요약 목업 → 입력관리 행 (초기 데이터 통합용) */
export function summaryRowsToInputRows(
  summaries: PerformanceSummaryRow[],
): PerformanceRow[] {
  const createId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`

  const rows: PerformanceRow[] = []

  summaries.forEach((summary) => {
    let pushed = false

    DISPLAY_MONTHS.forEach((month) => {
      const plan = summary.plan.monthly[month] ?? emptyMetrics()
      const actual = summary.actual.monthly[month] ?? emptyMetrics()

      if (!hasMetrics(plan) && !hasMetrics(actual)) return

      pushed = true
      rows.push({
        id: createId(),
        selected: false,
        subProject: summary.subProject,
        detailCategory: summary.detailCategory,
        month,
        planPeople: plan.people,
        planCount: plan.count,
        planBudget: plan.budget,
        actualPeople: actual.people,
        actualCount: actual.count,
        actualExpense: actual.budget,
        content: "",
        fundingSources: [...summary.fundingSources],
      })
    })

    if (pushed) return

    const plan = summary.plan.total
    const actual = summary.actual.total

    if (!hasMetrics(plan) && !hasMetrics(actual)) return

    rows.push({
      id: createId(),
      selected: false,
      subProject: summary.subProject,
      detailCategory: summary.detailCategory,
      month: "1월",
      planPeople: plan.people,
      planCount: plan.count,
      planBudget: plan.budget,
      actualPeople: actual.people,
      actualCount: actual.count,
      actualExpense: actual.budget,
      content: "",
      fundingSources: [...summary.fundingSources],
    })
  })

  return rows
}

/** 입력관리 합계 ↔ 요약 탭 합계 검증용 */
export function computeInputTotals(rows: PerformanceRow[]) {
  return rows.filter(isInputRowCountable).reduce(
    (acc, row) => ({
      planPeople: acc.planPeople + row.planPeople,
      planCount: acc.planCount + row.planCount,
      planBudget: acc.planBudget + row.planBudget,
      actualPeople: acc.actualPeople + row.actualPeople,
      actualCount: acc.actualCount + row.actualCount,
      actualExpense: acc.actualExpense + row.actualExpense,
    }),
    {
      planPeople: 0,
      planCount: 0,
      planBudget: 0,
      actualPeople: 0,
      actualCount: 0,
      actualExpense: 0,
    },
  )
}

export function computeSummaryTotals(summaryRows: PerformanceSummaryRow[]) {
  return summaryRows.reduce(
    (acc, row) => ({
      planPeople: acc.planPeople + row.plan.total.people,
      planCount: acc.planCount + row.plan.total.count,
      planBudget: acc.planBudget + row.plan.total.budget,
      actualPeople: acc.actualPeople + row.actual.total.people,
      actualCount: acc.actualCount + row.actual.total.count,
      actualExpense: acc.actualExpense + row.actual.total.budget,
    }),
    {
      planPeople: 0,
      planCount: 0,
      planBudget: 0,
      actualPeople: 0,
      actualCount: 0,
      actualExpense: 0,
    },
  )
}
