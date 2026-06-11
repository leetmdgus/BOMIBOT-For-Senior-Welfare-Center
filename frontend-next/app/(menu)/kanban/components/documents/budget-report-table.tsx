"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

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
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const previousYear = year - 1

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    getBudgetReportRows({ year })
      .then((rows) => {
        if (!cancelled) setData(rows)
      })
      .catch((error) => {
        console.error("예산보고서 데이터 로드 실패:", error)
        if (!cancelled) {
          setData([])
          setLoadError("예산보고서 데이터를 불러오지 못했습니다.")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [year])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">예산보고서 데이터를 불러오는 중입니다.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-slate-300 bg-white p-12 text-center text-sm text-muted-foreground">
        {loadError}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-300 bg-white p-12 text-center">
        <p className="text-sm text-muted-foreground">
          선택한 연도에 표시할 예산 데이터가 없습니다. 칸반 업무의
          계획/실적 입력관리에서 연간 계획 예산·원천을 입력해 주세요.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{year}년 기준</p>
      </div>
    )
  }

  return (
    <div className="kanban-documents-report overflow-hidden rounded-lg border border-slate-300 bg-white">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[4%]" />
          <col className="w-[4%]" />
          <col className="w-[13%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-700 text-white">
            <Th colSpan={3}>예산과목</Th>
            <Th>{year}년 예산</Th>
            <Th>{previousYear}년 예산</Th>
            <Th colSpan={5}>재원구분(세입)</Th>
            <Th colSpan={2}>증감</Th>
          </tr>
          <tr className="bg-slate-600 text-white">
            <Th>관</Th>
            <Th>항</Th>
            <Th>목</Th>
            <Th />
            <Th />
            <Th>사업수입</Th>
            <Th>보조금</Th>
            <Th>후원금</Th>
            <Th className="leading-tight">법인전입금</Th>
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
                <Td right numeric className="bg-sky-50">
                  {formatAmount(row.budgetCurrent)}
                </Td>
                <Td right numeric>
                  {formatAmount(row.budgetPrevious)}
                </Td>
                <Td right numeric className="bg-sky-50 text-sky-800">
                  {formatAmount(row.income)}
                </Td>
                <Td right numeric className="bg-sky-50 text-sky-800">
                  {formatAmount(row.subsidy)}
                </Td>
                <Td right numeric className="bg-sky-50">
                  {formatAmount(row.sponsor)}
                </Td>
                <Td right numeric className="bg-sky-50">
                  {formatAmount(row.transfer)}
                </Td>
                <Td right numeric className="bg-sky-50">
                  {formatAmount(row.misc)}
                </Td>
                <Td right numeric className="text-sky-800">
                  {formatAmount(row.amount)}
                </Td>
                <Td center>{row.ratio}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="border-t border-slate-200 px-4 py-2 text-xs text-muted-foreground print:text-slate-600">
        {year}년 예산보고서 · 단위: 원
      </p>
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
        "border border-slate-500 px-1.5 py-2 text-center text-xs font-semibold leading-snug sm:px-2 sm:text-sm",
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
  numeric,
}: {
  children?: React.ReactNode
  className?: string
  center?: boolean
  right?: boolean
  numeric?: boolean
}) {
  return (
    <td
      className={cn(
        "border border-slate-200 px-1.5 py-1.5 align-top text-xs sm:px-2 sm:py-2 sm:text-sm",
        center && "text-center",
        right && "text-right",
        numeric && "break-all tabular-nums leading-snug",
        !numeric && "whitespace-normal break-words",
        className,
      )}
    >
      {children}
    </td>
  )
}
