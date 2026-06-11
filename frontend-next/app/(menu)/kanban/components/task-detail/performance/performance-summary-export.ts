import * as XLSX from "xlsx"

import type { PerformanceSummaryRow } from "@/services/kanban.performance.types"

import {
  VIEW_TITLES,
  type PerformanceSummaryVariant,
} from "./performance-summary.constants"

type Metrics = { people: number; count: number; budget: number }

const ZERO: Metrics = { people: 0, count: 0, budget: 0 }

function addMetrics(a: Metrics, b: Metrics): Metrics {
  return {
    people: a.people + b.people,
    count: a.count + b.count,
    budget: a.budget + b.budget,
  }
}

/** variant 기준 표시값(계획 또는 실적). result/actual 은 실적값을 사용. */
function metricsFor(
  row: PerformanceSummaryRow,
  variant: PerformanceSummaryVariant,
  month?: string,
): Metrics {
  const side = variant === "plan" ? row.plan : row.actual
  if (!month) return side.total
  return side.monthly[month] ?? ZERO
}

function planMetricsFor(row: PerformanceSummaryRow, month?: string): Metrics {
  if (!month) return row.plan.total
  return row.plan.monthly[month] ?? ZERO
}

/** performance-provider.getProgressRate 와 동일한 계산. */
function progressRate(plan: number, actual: number): string {
  if (plan === 0) return "-"
  return `${Math.round((actual / plan) * 100)}%`
}

function rowLabel(row: PerformanceSummaryRow): string {
  return row.detailCategory
    ? `${row.subProject} · ${row.detailCategory}`
    : row.subProject
}

export interface SummaryExportParams {
  variant: PerformanceSummaryVariant
  /** 화면에 보이는(필터·정렬·드릴다운 반영된) 순서 그대로의 행 */
  rows: PerformanceSummaryRow[]
  /** 화면에 표시 중인 월 컬럼 (전체면 1~12월, 특정 월이면 1개) */
  displayMonths: string[]
  planVersion: string
  /** 월 필터 라벨 ("전체" 또는 "N월") */
  monthLabel: string
  /** 원천 필터 라벨 ("전체" 또는 원천명) */
  sourceLabel: string
}

/** 사업계획/사업실적/사업결과 요약표를 화면과 동일한 형태의 CSV 행렬로 만든다. */
export function buildSummaryCsvMatrix(
  params: SummaryExportParams,
): (string | number)[][] {
  const { variant, rows, displayMonths } = params
  const isResult = variant === "result"
  const budgetHeader = variant === "plan" ? "예산(원)" : "지출(원)"

  const header: string[] = ["세부사업명·상세분류", "원천"]
  header.push(`총계 인원(명)`, `총계 횟수(회)`, `총계 ${budgetHeader}`)
  if (isResult) {
    header.push("달성률(인원)", "달성률(횟수)", "달성률(예산)")
  }
  for (const month of displayMonths) {
    header.push(`${month} 인원(명)`, `${month} 횟수(회)`, `${month} ${budgetHeader}`)
  }

  const buildRowCells = (
    label: string,
    sources: string,
    metric: (month?: string) => Metrics,
    planMetric: (month?: string) => Metrics,
  ): (string | number)[] => {
    const total = metric()
    const cells: (string | number)[] = [
      label,
      sources,
      total.people,
      total.count,
      total.budget,
    ]
    if (isResult) {
      const planTotal = planMetric()
      cells.push(
        progressRate(planTotal.people, total.people),
        progressRate(planTotal.count, total.count),
        progressRate(planTotal.budget, total.budget),
      )
    }
    for (const month of displayMonths) {
      const m = metric(month)
      cells.push(m.people, m.count, m.budget)
    }
    return cells
  }

  // 합계 행 — 표시된 행을 월별로 합산
  const sumGrand = (month?: string) =>
    rows.reduce((acc, row) => addMetrics(acc, metricsFor(row, variant, month)), {
      ...ZERO,
    })
  const sumGrandPlan = (month?: string) =>
    rows.reduce((acc, row) => addMetrics(acc, planMetricsFor(row, month)), {
      ...ZERO,
    })

  const matrix: (string | number)[][] = [
    [VIEW_TITLES[variant]],
    [
      `적용 추경: ${params.planVersion}`,
      `월: ${params.monthLabel}`,
      `원천: ${params.sourceLabel}`,
    ],
    [],
    header,
    buildRowCells("합계", "", sumGrand, sumGrandPlan),
    ...rows.map((row) =>
      buildRowCells(
        rowLabel(row),
        row.fundingSources.join(","),
        (month) => metricsFor(row, variant, month),
        (month) => planMetricsFor(row, month),
      ),
    ),
  ]

  return matrix
}

/** 요약표 CSV 를 생성해 즉시 다운로드한다 (UTF-8 BOM 으로 엑셀 한글 깨짐 방지). */
export function downloadSummaryCsv(params: SummaryExportParams): void {
  const sheet = XLSX.utils.aoa_to_sheet(buildSummaryCsvMatrix(params))
  const csv = XLSX.utils.sheet_to_csv(sheet)
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${VIEW_TITLES[params.variant]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
