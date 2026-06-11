"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"

import { PrintOnly } from "@common/components/print-document"

import { useDocuments } from "./documents-provider"

function getPerformancePeriodLabel(
  quarter: number,
  periodMode: "quarter" | "month",
) {
  if (periodMode === "month") return "월간"
  if (quarter === 1 || quarter === 2) return "상반기"
  return "하반기"
}

/** 인쇄 시에만 표시되는 보고서 머리글 */
export function DocumentsPrintMeta() {
  const { viewTitle, year, quarter, periodMode, activeView } = useDocuments()
  const printedAt = format(new Date(), "yyyy.MM.dd HH:mm", { locale: ko })

  const meta =
    activeView === "performance"
      ? `${year}년 · ${quarter}분기 · ${getPerformancePeriodLabel(quarter, periodMode)}`
      : activeView === "budget"
        ? `${year}년 · 단위: 원`
        : `${year}년 통합 사업계획서`

  return (
    <PrintOnly>
      <header className="documents-print-meta mb-4 border-b-2 border-slate-800 pb-3">
        <h1 className="text-xl font-bold text-slate-900">{viewTitle}</h1>
        <p className="mt-1 text-sm text-slate-700">{meta}</p>
        <p className="mt-1 text-xs text-slate-500">인쇄일시 {printedAt}</p>
      </header>
    </PrintOnly>
  )
}
