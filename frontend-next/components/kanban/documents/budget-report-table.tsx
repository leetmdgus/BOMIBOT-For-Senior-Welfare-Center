"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { getBudgetReportRows } from "@/services/kanban.documents.service"
import type { BudgetReportRow } from "@/services/kanban.documents.types"

import { useDocuments } from "./documents-provider"

function formatAmount(value: number) {
  return value.toLocaleString("ko-KR")
}

export function BudgetReportTable() {
  const { year } = useDocuments()
  const [data, setData] = useState<BudgetReportRow[]>([])
  const previousYear = year - 1

  useEffect(() => {
    getBudgetReportRows()
      .then(setData)
      .catch((error) => {
        console.error("예산보고서 데이터 로드 실패:", error)
      })
  }, [])

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-700 text-white">
              <Th colSpan={3}>예산과목</Th>
              <Th>{year}년 예산</Th>
              <Th>{previousYear}년 예산</Th>
              <Th colSpan={5}>재원구분(세입)</Th>
              <Th colSpan={2}>증감</Th>
            </tr>
            <tr className="bg-slate-600 text-white">
              <Th className="w-20">관</Th>
              <Th className="w-20">항</Th>
              <Th className="w-56">목</Th>
              <Th />
              <Th />
              <Th>사업수입</Th>
              <Th>보조금</Th>
              <Th>후원금</Th>
              <Th>법인전입금</Th>
              <Th>잡수입</Th>
              <Th>금액</Th>
              <Th>대비</Th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => {
              const isTotal = row.rowType === "total"

              return (
                <tr
                  key={`${row.mok}-${index}`}
                  className={cn(
                    "border-b border-slate-200",
                    isTotal ? "bg-slate-100 font-bold" : "bg-white",
                  )}
                >
                  <Td center>{row.gwan}</Td>
                  <Td center>{row.hang}</Td>
                  <Td className={cn(isTotal && "font-bold")}>{row.mok}</Td>
                  <Td right className="bg-sky-50">
                    {formatAmount(row.budgetCurrent)}
                  </Td>
                  <Td right>{formatAmount(row.budgetPrevious)}</Td>
                  <Td right className="bg-sky-50 text-sky-800">
                    {formatAmount(row.income)}
                  </Td>
                  <Td right className="bg-sky-50 text-sky-800">
                    {formatAmount(row.subsidy)}
                  </Td>
                  <Td right className="bg-sky-50">
                    {formatAmount(row.sponsor)}
                  </Td>
                  <Td right className="bg-sky-50">
                    {formatAmount(row.transfer)}
                  </Td>
                  <Td right className="bg-sky-50">
                    {formatAmount(row.misc)}
                  </Td>
                  <Td right className="text-sky-800">
                    {formatAmount(row.amount)}
                  </Td>
                  <Td center>{row.ratio}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        "border border-slate-500 px-2 py-2.5 text-center font-semibold whitespace-nowrap",
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
}: {
  children?: React.ReactNode
  className?: string
  center?: boolean
  right?: boolean
}) {
  return (
    <td
      className={cn(
        "border border-slate-200 px-2 py-2 whitespace-nowrap",
        center && "text-center",
        right && "text-right",
        className,
      )}
    >
      {children}
    </td>
  )
}
