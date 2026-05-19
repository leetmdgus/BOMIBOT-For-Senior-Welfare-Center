"use client"

import { useEffect, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { getPerformanceReportRows } from "@/services/kanban.documents.service"
import type { PerformanceReportRow } from "@/services/kanban.documents.types"

import { useDocuments } from "./documents-provider"

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR")
}

function getPeriodLabel(quarter: number, periodMode: "quarter" | "month") {
  if (periodMode === "month") return "월간"
  if (quarter === 1 || quarter === 2) return "상반기"
  return "하반기"
}

export function PerformanceReportTable() {
  const { year, quarter, periodMode } = useDocuments()
  const [data, setData] = useState<PerformanceReportRow[]>([])

  useEffect(() => {
    getPerformanceReportRows()
      .then(setData)
      .catch((error) => {
        console.error("실적보고서 데이터 로드 실패:", error)
      })
  }, [])

  const periodLabel = useMemo(
    () => getPeriodLabel(quarter, periodMode),
    [quarter, periodMode],
  )

  let categoryRowsLeft = 0
  let projectRowsLeft = 0

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-700 text-white">
              <Th className="w-[80px]">대분류</Th>
              <Th className="w-[220px]">사업명</Th>
              <Th className="w-[180px]">세부사업명</Th>
              <Th className="w-[140px]">상세분류</Th>
              <Th>{periodLabel} 계획인원</Th>
              <Th>{periodLabel} 실적인원</Th>
              <Th>{periodLabel} 계획횟수</Th>
              <Th>{periodLabel} 실적횟수</Th>
              <Th>{periodLabel} 계획예산</Th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => {
              const isSubtotal = row.rowType === "subtotal"
              const categoryCell =
                categoryRowsLeft === 0 && row.majorCategoryRowSpan ? (
                  <Td
                    center
                    rowSpan={row.majorCategoryRowSpan}
                    className="align-middle font-medium"
                  >
                    {row.majorCategory}
                  </Td>
                ) : null

              if (row.majorCategoryRowSpan) {
                categoryRowsLeft = row.majorCategoryRowSpan - 1
              } else if (categoryRowsLeft > 0) {
                categoryRowsLeft -= 1
              }

              let projectCell: React.ReactNode = null

              if (isSubtotal && row.projectName) {
                projectCell = (
                  <Td colSpan={2} className="font-semibold">
                    {row.projectName}
                  </Td>
                )
              } else if (projectRowsLeft === 0 && row.projectNameRowSpan) {
                projectCell = (
                  <Td rowSpan={row.projectNameRowSpan} className="align-middle">
                    {row.projectName}
                  </Td>
                )
                projectRowsLeft = row.projectNameRowSpan - 1
              } else if (projectRowsLeft > 0) {
                projectRowsLeft -= 1
              }

              return (
                <tr
                  key={`${row.subProjectName}-${row.detailCategory}-${index}`}
                  className={cn(
                    "border-b border-slate-200",
                    isSubtotal ? "bg-sky-100 font-semibold" : "bg-white",
                  )}
                >
                  {categoryCell}
                  {projectCell}
                  {!isSubtotal ? (
                    <>
                      <Td>{row.subProjectName}</Td>
                      <Td>{row.detailCategory}</Td>
                    </>
                  ) : null}
                  <Td right>{formatNumber(row.planPeople)}</Td>
                  <Td right className="text-sky-700">
                    {formatNumber(row.actualPeople)}
                  </Td>
                  <Td right>{formatNumber(row.planCount)}</Td>
                  <Td right className="text-sky-700">
                    {formatNumber(row.actualCount)}
                  </Td>
                  <Td right>{formatNumber(row.planBudget)}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-200 px-4 py-2 text-xs text-muted-foreground">
        {year}년 · {quarter}분기 · {periodLabel} 기준
      </p>
    </div>
  )
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "border border-slate-600 px-3 py-2.5 text-center font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = "",
  center,
  right,
  rowSpan,
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  center?: boolean
  right?: boolean
  rowSpan?: number
  colSpan?: number
}) {
  return (
    <td
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={cn(
        "border border-slate-200 px-3 py-2 whitespace-nowrap",
        center && "text-center",
        right && "text-right",
        className,
      )}
    >
      {children}
    </td>
  )
}
