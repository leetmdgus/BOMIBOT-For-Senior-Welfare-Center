"use client"

import { useMemo, useState } from "react"
import { Download, HelpCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { PerformanceSummaryRow } from "@/services/kanban.performance.types"

import {
  DISPLAY_MONTHS,
  FUNDING_SOURCE_COLORS,
  FUNDING_SOURCES,
  MONTH_OPTIONS,
  type SummaryFundingSourceFilter,
  type SummaryMonthFilter,
  VIEW_TITLES,
  VIEW_TOOLTIPS,
  formatFundingSourceLabel,
  type FundingSourceCode,
  type PerformanceSummaryVariant,
  type PerformanceViewMode,
} from "./performance-summary.constants"
import { usePerformance } from "./performance-provider"

type Metrics = { people: number; count: number; budget: number }

function mergeMetrics(a: Metrics, b: Metrics): Metrics {
  return {
    people: a.people + b.people,
    count: a.count + b.count,
    budget: a.budget + b.budget,
  }
}

function aggregateBySubProject(
  rows: PerformanceSummaryRow[],
): PerformanceSummaryRow[] {
  const grouped = new Map<string, PerformanceSummaryRow[]>()

  rows.forEach((row) => {
    const list = grouped.get(row.subProject) ?? []
    list.push(row)
    grouped.set(row.subProject, list)
  })

  return Array.from(grouped.entries()).map(([subProject, group]) => {
    const fundingSources = [
      ...new Set(group.flatMap((row) => row.fundingSources)),
    ] as FundingSourceCode[]

    const planTotal = group.reduce(
      (acc, row) => mergeMetrics(acc, row.plan.total),
      { people: 0, count: 0, budget: 0 },
    )
    const actualTotal = group.reduce(
      (acc, row) => mergeMetrics(acc, row.actual.total),
      { people: 0, count: 0, budget: 0 },
    )

    const planMonthly = { ...group[0].plan.monthly }
    const actualMonthly = { ...group[0].actual.monthly }

    DISPLAY_MONTHS.forEach((month) => {
      planMonthly[month] = group.reduce(
        (acc, row) => mergeMetrics(acc, row.plan.monthly[month] ?? { people: 0, count: 0, budget: 0 }),
        { people: 0, count: 0, budget: 0 },
      )
      actualMonthly[month] = group.reduce(
        (acc, row) =>
          mergeMetrics(acc, row.actual.monthly[month] ?? { people: 0, count: 0, budget: 0 }),
        { people: 0, count: 0, budget: 0 },
      )
    })

    return {
      id: `agg-${subProject}`,
      subProject,
      detailCategory: "",
      fundingSources,
      plan: { total: planTotal, monthly: planMonthly },
      actual: { total: actualTotal, monthly: actualMonthly },
    }
  })
}

export function PerformanceSummaryView({
  variant,
}: {
  variant: PerformanceSummaryVariant
}) {
  const {
    summaryRows: summarySourceRows,
    planVersion,
    getProgressRate,
    getProgressColor,
    summaryMonth: selectedMonth,
    setSummaryMonth,
    summaryFundingSource: selectedSource,
    setSummaryFundingSource,
    summaryViewMode: viewMode,
    setSummaryViewMode: setViewMode,
    summaryFocusedSubProject: focusedSubProject,
    summaryFocusedDetailCategory: focusedDetailCategory,
    setSummaryFocusedSubProject: setFocusedSubProject,
    setSummaryFocusedDetailCategory: setFocusedDetailCategory,
    resetSummaryRowFilter,
  } = usePerformance()
  const [isLoading] = useState(false)

  const sourceFilteredRows = useMemo(() => {
    return summarySourceRows.filter((row) => {
      if (selectedSource === "all") return true
      return row.fundingSources.includes(selectedSource as FundingSourceCode)
    })
  }, [summarySourceRows, selectedSource])

  const displayRows = useMemo(() => {
    let rows = sourceFilteredRows

    if (focusedSubProject) {
      rows = rows.filter((row) => row.subProject === focusedSubProject)

      if (focusedDetailCategory) {
        rows = rows.filter((row) => row.detailCategory === focusedDetailCategory)
      }

      return rows
    }

    if (viewMode === "subProject") {
      return aggregateBySubProject(rows)
    }

    return rows
  }, [
    sourceFilteredRows,
    focusedSubProject,
    focusedDetailCategory,
    viewMode,
  ])

  const displayMonths = useMemo(() => {
    if (selectedMonth === "전체") return [...DISPLAY_MONTHS]
    return [selectedMonth]
  }, [selectedMonth])

  const isCompactMonthView = displayMonths.length < DISPLAY_MONTHS.length
  const metricGroupCount = 1 + displayMonths.length
  const dataColumnCount = metricGroupCount * 3
  const dataColumnWidthPercent = isCompactMonthView
    ? `${70 / dataColumnCount}%`
    : undefined

  const totals = useMemo(() => {
    return displayRows.reduce(
      (acc, row) => {
        const plan = row.plan.total
        const actual = row.actual.total

        acc.plan = mergeMetrics(acc.plan, plan)
        acc.actual = mergeMetrics(acc.actual, actual)

        displayMonths.forEach((month) => {
          acc.planMonthly[month] = mergeMetrics(
            acc.planMonthly[month],
            row.plan.monthly[month] ?? { people: 0, count: 0, budget: 0 },
          )
          acc.actualMonthly[month] = mergeMetrics(
            acc.actualMonthly[month],
            row.actual.monthly[month] ?? { people: 0, count: 0, budget: 0 },
          )
        })

        return acc
      },
      {
        plan: { people: 0, count: 0, budget: 0 },
        actual: { people: 0, count: 0, budget: 0 },
        planMonthly: Object.fromEntries(
          displayMonths.map((month) => [month, { people: 0, count: 0, budget: 0 }]),
        ) as Record<string, Metrics>,
        actualMonthly: Object.fromEntries(
          displayMonths.map((month) => [month, { people: 0, count: 0, budget: 0 }]),
        ) as Record<string, Metrics>,
      },
    )
  }, [displayRows, displayMonths])

  const getMetrics = (row: PerformanceSummaryRow, month?: string): Metrics => {
    if (variant === "plan") {
      if (!month) return row.plan.total
      return row.plan.monthly[month] ?? { people: 0, count: 0, budget: 0 }
    }

    if (!month) return row.actual.total
    return row.actual.monthly[month] ?? { people: 0, count: 0, budget: 0 }
  }

  const resetRowFilter = () => {
    resetSummaryRowFilter()
  }

  const handleSubProjectClick = (subProject: string) => {
    setFocusedSubProject(subProject)
    setFocusedDetailCategory(null)
  }

  const handleDetailClick = (subProject: string, detailCategory: string) => {
    setFocusedSubProject(subProject)
    setFocusedDetailCategory(detailCategory)
  }

  const isDrillDown = Boolean(focusedSubProject)
  const showDetailRows =
    viewMode === "detail" || isDrillDown

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">데이터를 불러오는 중입니다.</p>
      </div>
    )
  }

  if (summarySourceRows.length === 0) {
    return (
      <div className="w-full rounded border border-slate-300 bg-white p-12 text-center">
        <h2 className="text-2xl font-bold">{VIEW_TITLES[variant]}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          계획/실적 입력관리 탭에서 세목·세세목·월별 계획·실적을 입력하면 이
          화면에 동일한 데이터가 집계됩니다.
        </p>
      </div>
    )
  }

  const summaryMetrics = variant === "plan" ? totals.plan : totals.actual
  const summaryMonthly =
    variant === "plan" ? totals.planMonthly : totals.actualMonthly

  return (
    <div className="w-full rounded border border-slate-300 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <h2 className="text-3xl font-bold tracking-tight">
          {VIEW_TITLES[variant]}
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground">
              <HelpCircle className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm text-sm">
            {VIEW_TOOLTIPS[variant]}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="print-hide flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedMonth}
            onValueChange={(value) => setSummaryMonth(value as SummaryMonthFilter)}
          >
            <SelectTrigger className="h-9 w-[100px] bg-white">
              <SelectValue placeholder="월" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month === "전체" ? "월" : month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSource}
            onValueChange={(value) =>
              setSummaryFundingSource(value as SummaryFundingSourceFilter)
            }
          >
            <SelectTrigger className="h-9 min-w-[140px] bg-white">
              <SelectValue placeholder="원천" />
            </SelectTrigger>
            <SelectContent>
              {FUNDING_SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {formatFundingSourceLabel(source)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="sm" onClick={resetRowFilter}>
            초기화
          </Button>

          {isDrillDown ? (
            <span className="text-xs text-muted-foreground">
              {focusedDetailCategory
                ? `${focusedSubProject} · ${focusedDetailCategory}`
                : focusedSubProject}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            적용 추경: {planVersion}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 bg-slate-100"
            onClick={() => window.alert("다운로드 기능은 API 연동 후 제공됩니다.")}
          >
            <Download className="size-4" />
            다운로드
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="print-hide absolute right-4 top-3 z-30 flex rounded-md border border-slate-300 bg-white p-0.5 text-sm shadow-sm">
          <ViewModeButton
            active={viewMode === "subProject"}
            onClick={() => {
              setViewMode("subProject")
              if (!isDrillDown) resetRowFilter()
            }}
          >
            세부사업명별
          </ViewModeButton>
          <ViewModeButton
            active={viewMode === "detail"}
            onClick={() => {
              setViewMode("detail")
              if (!isDrillDown) resetRowFilter()
            }}
          >
            상세분류별
          </ViewModeButton>
        </div>

        <div
          className={cn(
            "pt-12",
            isCompactMonthView ? "overflow-x-visible" : "overflow-x-auto",
          )}
        >
          <table
            className={cn(
              "w-full border-collapse text-sm",
              isCompactMonthView ? "table-fixed" : "min-w-[2600px]",
            )}
          >
            {isCompactMonthView ? (
              <colgroup>
                <col style={{ width: "30%" }} />
                {Array.from({ length: dataColumnCount }).map((_, index) => (
                  <col key={index} style={{ width: dataColumnWidthPercent }} />
                ))}
              </colgroup>
            ) : null}
            <thead>
              <tr>
                <Th
                  rowSpan={2}
                  className={cn(
                    "bg-slate-100 text-left",
                    isCompactMonthView
                      ? "min-w-0"
                      : "sticky left-0 z-20 min-w-[330px]",
                  )}
                >
                  세부사업명 · 상세분류
                </Th>
                <Th colSpan={3} className="bg-slate-100">
                  총계
                </Th>
                {displayMonths.map((month, index) => (
                  <Th
                    key={month}
                    colSpan={3}
                    className={index % 2 === 0 ? "bg-blue-200" : "bg-sky-50"}
                  >
                    {month}
                  </Th>
                ))}
              </tr>
              <tr>
                <SubHeader />
                {displayMonths.map((month, index) => (
                  <SubHeader key={month} blue={index % 2 === 0} />
                ))}
              </tr>
            </thead>

            <tbody>
              <tr className="bg-sky-100 font-bold">
                <StickyTd compact={isCompactMonthView}>합계</StickyTd>
                <MetricCells
                  metrics={summaryMetrics}
                  variant={variant}
                  planMetrics={totals.plan}
                  getProgressRate={getProgressRate}
                  getProgressColor={getProgressColor}
                  strong
                />
                {displayMonths.map((month) => (
                  <MetricCells
                    key={month}
                    metrics={summaryMonthly[month]}
                    variant={variant}
                    planMetrics={totals.planMonthly[month]}
                    getProgressRate={getProgressRate}
                    getProgressColor={getProgressColor}
                    strong
                  />
                ))}
              </tr>

              {displayRows.map((row) => {
                const total = getMetrics(row)
                const planTotal = row.plan.total
                const isAggregate =
                  viewMode === "subProject" &&
                  !isDrillDown &&
                  !row.detailCategory

                return (
                  <tr key={row.id} className="hover:bg-sky-50/40">
                    <StickyTd
                      compact={isCompactMonthView}
                      className="font-semibold"
                    >
                      <RowLabelCell
                        row={row}
                        showDetailRows={showDetailRows}
                        isAggregate={isAggregate}
                        onSubProjectClick={handleSubProjectClick}
                        onDetailClick={handleDetailClick}
                      />
                    </StickyTd>
                    <MetricCells
                      metrics={total}
                      variant={variant}
                      planMetrics={planTotal}
                      fundingSources={row.fundingSources}
                      getProgressRate={getProgressRate}
                      getProgressColor={getProgressColor}
                    />
                    {displayMonths.map((month) => (
                      <MetricCells
                        key={month}
                        metrics={getMetrics(row, month)}
                        variant={variant}
                        planMetrics={row.plan.monthly[month]}
                        fundingSources={row.fundingSources}
                        getProgressRate={getProgressRate}
                        getProgressColor={getProgressColor}
                      />
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!isCompactMonthView ? (
        <div className="print-hide h-5 border-t border-slate-200 bg-slate-50">
          <div className="mx-4 mt-1 h-2 rounded-full bg-slate-300">
            <div className="ml-[8%] h-2 w-[35%] rounded-full bg-slate-500" />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RowLabelCell({
  row,
  showDetailRows,
  isAggregate,
  onSubProjectClick,
  onDetailClick,
}: {
  row: PerformanceSummaryRow
  showDetailRows: boolean
  isAggregate: boolean
  onSubProjectClick: (subProject: string) => void
  onDetailClick: (subProject: string, detailCategory: string) => void
}) {
  if (isAggregate) {
    return (
      <button
        type="button"
        className="text-left font-semibold text-primary hover:underline"
        onClick={() => onSubProjectClick(row.subProject)}
      >
        {row.subProject}
      </button>
    )
  }

  if (showDetailRows && row.detailCategory) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => onSubProjectClick(row.subProject)}
        >
          {row.subProject}
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => onDetailClick(row.subProject, row.detailCategory)}
        >
          {row.detailCategory}
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      className="text-left font-semibold text-primary hover:underline"
      onClick={() => onSubProjectClick(row.subProject)}
    >
      {row.subProject}
    </button>
  )
}

function ViewModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function MetricCells({
  metrics,
  variant,
  planMetrics,
  fundingSources = [],
  getProgressRate,
  getProgressColor,
  strong,
}: {
  metrics: Metrics
  variant: PerformanceSummaryVariant
  planMetrics: Metrics
  fundingSources?: FundingSourceCode[]
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
  strong?: boolean
}) {
  return (
    <>
      <Td
        right
        strong={strong}
        className={
          variant === "result"
            ? getProgressColor(planMetrics.people, metrics.people)
            : undefined
        }
      >
        {metrics.people.toLocaleString()}
        {variant === "result" ? (
          <ProgressHint
            plan={planMetrics.people}
            actual={metrics.people}
            getProgressRate={getProgressRate}
          />
        ) : null}
      </Td>
      <Td
        right
        strong={strong}
        className={
          variant === "result"
            ? getProgressColor(planMetrics.count, metrics.count)
            : undefined
        }
      >
        {metrics.count.toLocaleString()}
        {variant === "result" ? (
          <ProgressHint
            plan={planMetrics.count}
            actual={metrics.count}
            getProgressRate={getProgressRate}
          />
        ) : null}
      </Td>
      <Td right strong={strong}>
        <BudgetCell
          value={metrics.budget}
          fundingSources={fundingSources}
          progressRate={
            variant === "result"
              ? getProgressRate(planMetrics.budget, metrics.budget)
              : undefined
          }
          progressColor={
            variant === "result"
              ? getProgressColor(planMetrics.budget, metrics.budget)
              : undefined
          }
        />
      </Td>
    </>
  )
}

function ProgressHint({
  plan,
  actual,
  getProgressRate,
}: {
  plan: number
  actual: number
  getProgressRate: (plan: number, actual: number) => string
}) {
  return (
    <p className="text-[10px] font-normal text-muted-foreground">
      {getProgressRate(plan, actual)}
    </p>
  )
}

function BudgetCell({
  value,
  fundingSources = [],
  progressRate,
  progressColor,
}: {
  value: number
  fundingSources?: FundingSourceCode[]
  progressRate?: string
  progressColor?: string
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center justify-end gap-1.5">
        {fundingSources.map((code) => (
          <span
            key={code}
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded px-0.5 text-[10px] font-bold text-white",
              FUNDING_SOURCE_COLORS[code],
            )}
          >
            {code}
          </span>
        ))}
        <span>{value.toLocaleString()}</span>
      </div>
      {progressRate ? (
        <span className={cn("text-[10px] font-medium", progressColor)}>
          {progressRate}
        </span>
      ) : null}
    </div>
  )
}

function SubHeader({ blue }: { blue?: boolean }) {
  const bg = blue ? "bg-blue-50" : "bg-sky-50"

  return (
    <>
      <Th className={bg}>인원(명)</Th>
      <Th className={bg}>횟수(회)</Th>
      <Th className={bg}>예산(원)</Th>
    </>
  )
}

function Th({
  children,
  className = "",
  colSpan,
  rowSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
  rowSpan?: number
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-slate-300 px-4 py-3 text-center font-bold whitespace-nowrap",
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
  right,
  strong,
}: {
  children?: React.ReactNode
  className?: string
  right?: boolean
  strong?: boolean
}) {
  return (
    <td
      className={cn(
        "border border-slate-300 px-4 py-4 whitespace-nowrap align-middle",
        right && "text-right",
        strong && "font-bold",
        className,
      )}
    >
      {children}
    </td>
  )
}

function StickyTd({
  children,
  className = "",
  compact = false,
}: {
  children?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <td
      className={cn(
        "border border-slate-300 bg-white px-4 py-4 text-left",
        compact
          ? "min-w-0 whitespace-normal break-words"
          : "sticky left-0 z-10 min-w-[330px] whitespace-nowrap",
        className,
      )}
    >
      {children}
    </td>
  )
}
