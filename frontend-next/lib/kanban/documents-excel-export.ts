import * as XLSX from "xlsx"

import {
  getBudgetReportRows,
  getBusinessPlanReport,
  getPerformanceReportRows,
} from "@/services/kanban.documents.service"
import type {
  BudgetReportRow,
  BusinessPlanItem,
  BusinessPlanReport,
  PerformanceReportRow,
} from "@/services/kanban.documents.types"

export type DocumentsExcelView = "performance" | "budget" | "business-plan"
export type DocumentsExcelPeriodMode = "quarter" | "month"

export function getPerformancePeriodLabel(
  quarter: number,
  periodMode: DocumentsExcelPeriodMode,
) {
  if (periodMode === "month") return "월간"
  if (quarter === 1 || quarter === 2) return "상반기"
  return "하반기"
}

function sanitizeFileNamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_")
}

function expandPerformanceRows(rows: PerformanceReportRow[]) {
  let currentMajor = ""
  let currentProject = ""

  return rows.map((row) => {
    if (row.majorCategory) {
      currentMajor = row.majorCategory
    }

    const isSubtotal = row.rowType === "subtotal"

    if (row.projectName && !isSubtotal) {
      currentProject = row.projectName
    }

    return {
      ...row,
      majorCategory: row.majorCategory || currentMajor,
      projectName: isSubtotal
        ? row.projectName
        : row.projectName || currentProject,
    }
  })
}

function formatBusinessPlanItemContent(item: BusinessPlanItem) {
  return [
    `목적: ${item.purpose}`,
    `대상: ${item.target}`,
    `기간: ${item.period}`,
    `운영방법: ${item.method}`,
    `평가방법: ${item.evaluation}`,
  ].join("\n")
}

function formatBusinessPlanBudget(item: BusinessPlanItem) {
  if (item.budget <= 0) return "—"
  return `사업수익 ${item.budget.toLocaleString("ko-KR")}\n계 ${item.budget.toLocaleString("ko-KR")}`
}

export function buildPerformanceSheetRows(
  rows: PerformanceReportRow[],
  periodLabel: string,
) {
  const expanded = expandPerformanceRows(rows)

  return expanded.map((row) => {
    const isSubtotal = row.rowType === "subtotal"

    return {
      대분류: row.majorCategory,
      사업명: row.projectName,
      세부사업명: isSubtotal ? "" : row.subProjectName,
      상세분류: isSubtotal ? "" : row.detailCategory,
      [`${periodLabel} 계획인원`]: row.planPeople,
      [`${periodLabel} 실적인원`]: row.actualPeople,
      [`${periodLabel} 계획횟수`]: row.planCount,
      [`${periodLabel} 실적횟수`]: row.actualCount,
      [`${periodLabel} 계획예산`]: row.planBudget,
    }
  })
}

export function buildBudgetSheet(
  rows: BudgetReportRow[],
  year: number,
) {
  const previousYear = year - 1
  const headerRow1 = [
    "관",
    "항",
    "목",
    `${year}년 예산`,
    `${previousYear}년 예산`,
    "사업수입",
    "보조금",
    "후원금",
    "법인전입금",
    "잡수입",
    "금액",
    "대비",
  ]

  const body = rows.map((row) => [
    row.gwan,
    row.hang,
    row.mok,
    row.budgetCurrent,
    row.budgetPrevious,
    row.income,
    row.subsidy,
    row.sponsor,
    row.transfer,
    row.misc,
    row.amount,
    row.ratio,
  ])

  const sheet = XLSX.utils.aoa_to_sheet([headerRow1, ...body])
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 6 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
  ]

  return sheet
}

export function buildBusinessPlanSheets(report: BusinessPlanReport) {
  const statsSheet = XLSX.utils.json_to_sheet(
    report.stats.map((stat) => ({
      항목: stat.label,
      값: stat.unit ? `${stat.value}${stat.unit}` : stat.value,
    })),
  )

  const planRows: Record<string, string | number>[] = []

  for (const project of report.projects) {
    planRows.push({
      대분류: project.category,
      하위분류: project.subCategory,
      세부사업명: "소계",
      명: project.subtotal.people,
      회: project.subtotal.count,
      "예산(천원)": project.subtotal.budget,
      사업내용: project.subtotal.content,
    })

    for (const item of project.items) {
      planRows.push({
        대분류: project.category,
        하위분류: project.subCategory,
        세부사업명: item.name,
        명: item.people,
        회: item.count,
        "예산(천원)": formatBusinessPlanBudget(item),
        사업내용: formatBusinessPlanItemContent(item),
      })
    }
  }

  const planSheet = XLSX.utils.json_to_sheet(planRows)
  planSheet["!cols"] = [
    { wch: 10 },
    { wch: 24 },
    { wch: 28 },
    { wch: 8 },
    { wch: 8 },
    { wch: 16 },
    { wch: 48 },
  ]

  return { statsSheet, planSheet }
}

export async function downloadDocumentsExcel(options: {
  activeView: DocumentsExcelView
  year: number
  quarter: number
  periodMode: DocumentsExcelPeriodMode
}) {
  const { activeView, year, quarter, periodMode } = options
  const book = XLSX.utils.book_new()

  if (activeView === "performance") {
    const rows = await getPerformanceReportRows({
      year,
      quarter,
      periodMode,
    })
    const periodLabel = getPerformancePeriodLabel(quarter, periodMode)
    const sheet = XLSX.utils.json_to_sheet(
      buildPerformanceSheetRows(rows, periodLabel),
    )
    XLSX.utils.book_append_sheet(book, sheet, "실적보고서")

    const periodPart =
      periodMode === "month"
        ? "월간"
        : `${quarter}분기_${periodLabel}`
    const fileName = sanitizeFileNamePart(
      `실적보고서_${year}년_${periodPart}.xlsx`,
    )
    XLSX.writeFile(book, fileName)
    return
  }

  if (activeView === "budget") {
    const rows = await getBudgetReportRows({ year })
    const sheet = buildBudgetSheet(rows, year)
    XLSX.utils.book_append_sheet(book, sheet, "예산보고서")
    XLSX.writeFile(
      book,
      sanitizeFileNamePart(`예산보고서_${year}년.xlsx`),
    )
    return
  }

  const report = await getBusinessPlanReport({ year })
  const { statsSheet, planSheet } = buildBusinessPlanSheets(report)
  XLSX.utils.book_append_sheet(book, statsSheet, "연도별통계")
  XLSX.utils.book_append_sheet(book, planSheet, "사업계획")
  XLSX.writeFile(
    book,
    sanitizeFileNamePart(`사업계획서_${year}년.xlsx`),
  )
}
