"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  PerformanceFundingEntry,
  PerformanceFundingSource,
} from "@/services/kanban.performance.types"
import { cn } from "@/lib/utils"

import {
  FUNDING_SOURCE_COLORS,
  SELECTABLE_FUNDING_SOURCES,
} from "./performance-summary.constants"

type FundingBudgetCellProps = {
  entries: PerformanceFundingEntry[]
  variant: "plan" | "actual"
  isActive?: boolean
  onChange: (entries: PerformanceFundingEntry[]) => void
}

export function FundingBudgetCell({
  entries,
  variant,
  isActive,
  onChange,
}: FundingBudgetCellProps) {
  const [open, setOpen] = useState(false)
  const [pickSource, setPickSource] = useState<PerformanceFundingSource | "">(
    "",
  )

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)
  const usedSources = new Set(entries.map((entry) => entry.source))
  const availableSources = SELECTABLE_FUNDING_SOURCES.filter(
    (source) => !usedSources.has(source.value),
  )

  const addSource = (source: PerformanceFundingSource) => {
    if (usedSources.has(source)) return
    onChange([...entries, { source, amount: 0 }])
    setPickSource("")
  }

  const updateAmount = (source: PerformanceFundingSource, amount: number) => {
    onChange(
      entries.map((entry) =>
        entry.source === source ? { ...entry, amount } : entry,
      ),
    )
  }

  const removeSource = (source: PerformanceFundingSource) => {
    onChange(entries.filter((entry) => entry.source !== source))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          className={cn(
            "flex min-h-8 w-full flex-col items-stretch justify-center gap-0.5 px-2 py-1 text-left text-sm outline-none",
            isActive && "bg-white",
            entries.length === 0 && "text-primary hover:underline",
          )}
        >
          {entries.length === 0 ? (
            <span className="text-center text-xs">클릭하여 원천 선택</span>
          ) : (
            entries.map((entry) => (
              <span
                key={entry.source}
                className="flex items-center justify-end gap-1 tabular-nums"
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-0.5 text-[10px] font-bold text-white",
                    FUNDING_SOURCE_COLORS[entry.source],
                  )}
                >
                  {entry.source}
                </span>
                <span>{entry.amount.toLocaleString()}</span>
              </span>
            ))
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="start"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">
            {variant === "plan" ? "원천 / 예산(원)" : "원천 / 지출(원)"}
          </p>
          <p className="text-xs text-muted-foreground">
            원천을 선택한 뒤 금액을 입력하세요.
          </p>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-2">
              등록된 원천이 없습니다.
            </p>
          ) : (
            entries.map((entry) => {
              const label = SELECTABLE_FUNDING_SOURCES.find(
                (source) => source.value === entry.source,
              )

              return (
                <div
                  key={entry.source}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/20 p-2"
                >
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white",
                      FUNDING_SOURCE_COLORS[entry.source],
                    )}
                    title={label?.label}
                  >
                    {entry.source}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-muted-foreground">
                      {label?.label ?? entry.source}
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={
                        entry.amount === 0 ? "" : entry.amount.toLocaleString()
                      }
                      placeholder="금액 입력"
                      className="mt-0.5 h-8 border-0 bg-white px-2 text-right text-sm shadow-none focus-visible:ring-1"
                      onChange={(event) => {
                        const cleaned = event.target.value
                          .replaceAll(",", "")
                          .trim()
                        updateAmount(
                          entry.source,
                          cleaned === "" ? 0 : Number(cleaned) || 0,
                        )
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSource(entry.source)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          <div className="flex gap-2">
            <Select
              value={pickSource}
              onValueChange={(value) => {
                const source = value as PerformanceFundingSource
                setPickSource(source)
                addSource(source)
              }}
            >
              <SelectTrigger className="h-9 flex-1 bg-white text-sm">
                <SelectValue placeholder="원천 선택" />
              </SelectTrigger>
              <SelectContent>
                {availableSources.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}({source.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableSources.length === 0 && entries.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              모든 원천이 추가되었습니다.
            </p>
          ) : null}

          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium">합계</span>
            <span className="font-semibold tabular-nums">
              {total.toLocaleString()}원
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            className="w-full"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            확인
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
