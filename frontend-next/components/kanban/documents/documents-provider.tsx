"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import { downloadDocumentsExcel } from "@/lib/kanban/documents-excel-export"
import { printPrintArea } from "@/lib/print-print-area"

export type DocumentsView = "performance" | "budget" | "business-plan"

export type ReportPeriodMode = "quarter" | "month"

const viewTitles: Record<DocumentsView, string> = {
  performance: "실적보고서",
  budget: "예산보고서",
  "business-plan": "사업계획서",
}

const DocumentsContext = createContext<{
  activeView: DocumentsView
  setActiveView: (view: DocumentsView) => void
  viewTitle: string
  year: number
  setYear: (year: number) => void
  periodMode: ReportPeriodMode
  setPeriodMode: (mode: ReportPeriodMode) => void
  quarter: number
  setQuarter: (quarter: number) => void
  yearOptions: number[]
  handleDownload: () => void
  handlePrint: () => void
} | null>(null)

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear()
  const [activeView, setActiveView] = useState<DocumentsView>("performance")
  const [year, setYear] = useState(currentYear)
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>("quarter")
  const [quarter, setQuarter] = useState(1)

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => currentYear - 2 + index),
    [currentYear],
  )

  const viewTitle = viewTitles[activeView]

  const handleDownload = useCallback(async () => {
    try {
      await downloadDocumentsExcel({
        activeView,
        year,
        quarter,
        periodMode,
      })
    } catch (error) {
      console.error("사업문서 엑셀 다운로드 실패:", error)
      window.alert("엑셀 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    }
  }, [activeView, year, quarter, periodMode])

  const handlePrint = useCallback(() => {
    printPrintArea()
  }, [])

  return (
    <DocumentsContext.Provider
      value={{
        activeView,
        setActiveView,
        viewTitle,
        year,
        setYear,
        periodMode,
        setPeriodMode,
        quarter,
        setQuarter,
        yearOptions,
        handleDownload,
        handlePrint,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  )
}

export function useDocuments() {
  const context = useContext(DocumentsContext)

  if (!context) {
    throw new Error("useDocuments must be used within DocumentsProvider")
  }

  return context
}
