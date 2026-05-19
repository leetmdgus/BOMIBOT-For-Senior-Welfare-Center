"use client"

import { Download, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import {
  useDocuments,
  type DocumentsView,
} from "./documents-provider"

const tabs: { label: string; view: DocumentsView }[] = [
  { label: "실적보고서", view: "performance" },
  { label: "예산보고서", view: "budget" },
  { label: "사업계획서", view: "business-plan" },
]

export function DocumentsHeader() {
  const {
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
  } = useDocuments()

  return (
    <div className="mb-6 space-y-4 print:mb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">{viewTitle}</h1>

        <div className="print-hide flex border-b border-border">
          {tabs.map((tab) => {
            const active = activeView === tab.view

            return (
              <button
                key={tab.view}
                type="button"
                onClick={() => setActiveView(tab.view)}
                className={cn(
                  "border-b-2 px-5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(value) => setYear(Number(value))}
          >
            <SelectTrigger className="h-9 w-[100px] bg-white">
              <SelectValue placeholder="연도" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeView === "performance" ? (
            <>
              <Select
                value={String(quarter)}
                onValueChange={(value) => setQuarter(Number(value))}
              >
                <SelectTrigger className="h-9 w-[100px] bg-white">
                  <SelectValue placeholder="분기" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}분기
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={periodMode}
                onValueChange={(value) =>
                  setPeriodMode(value as "quarter" | "month")
                }
              >
                <SelectTrigger className="h-9 w-[100px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">분기</SelectItem>
                  <SelectItem value="month">월간</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : null}
        </div>

        <div className="print-hide flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 bg-slate-100"
            onClick={handleDownload}
          >
            <Download className="size-4" />
            다운로드
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 bg-slate-100"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            인쇄하기
          </Button>
        </div>
      </div>
    </div>
  )
}
