"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"
import { Download, GripVertical, HelpCircle, Loader2 } from "lucide-react"

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
import type {
  PerformanceRow,
  PerformanceSummaryRow,
} from "@/services/kanban.performance.types"

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
import { normalizeDetailCategory } from "./input-rows-to-summary"
import { usePerformance } from "./performance-provider"

type Metrics = { people: number; count: number; budget: number }

const STICKY_LABEL_WIDTH_PX = 330
const STICKY_METRIC_WIDTH_PX = 110

type StickyColumnIndex = 0 | 1 | 2 | 3

function stickyLeftStyle(
  index: StickyColumnIndex,
  compact: boolean,
  dataColumnCount: number,
): CSSProperties | undefined {
  if (index === 0) {
    return compact ? { left: 0 } : { left: 0, minWidth: STICKY_LABEL_WIDTH_PX }
  }

  if (compact) {
    const labelPct = 30
    const metricPct = 70 / dataColumnCount
    const offset = labelPct + metricPct * (index - 1)
    return { left: `${offset}%` }
  }

  const left =
    STICKY_LABEL_WIDTH_PX + STICKY_METRIC_WIDTH_PX * (index - 1)
  return { left, minWidth: STICKY_METRIC_WIDTH_PX }
}

function stickySpanStyle(
  compact: boolean,
  dataColumnCount: number,
): CSSProperties {
  if (compact) {
    const metricPct = (70 / dataColumnCount) * 3
    return { left: "30%", width: `${metricPct}%` }
  }
  return {
    left: STICKY_LABEL_WIDTH_PX,
    minWidth: STICKY_METRIC_WIDTH_PX * 3,
  }
}

function reorderInputRowsBySummaryOrder(
  inputRows: PerformanceRow[],
  orderedKeys: string[],
  aggregate: boolean,
): PerformanceRow[] {
  const getKey = (row: PerformanceRow) => {
    if (!row.subProject || row.subProject === "선택") return null
    return aggregate
      ? `agg-${row.subProject}`
      : `${row.subProject}::${normalizeDetailCategory(row.detailCategory)}`
  }

  const blocks = new Map<string, PerformanceRow[]>()
  const remainingKeys: string[] = []
  const noKeyRows: PerformanceRow[] = []

  for (const row of inputRows) {
    const key = getKey(row)
    if (!key) {
      noKeyRows.push(row)
      continue
    }
    if (!blocks.has(key)) {
      blocks.set(key, [])
      remainingKeys.push(key)
    }
    blocks.get(key)!.push(row)
  }

  const seen = new Set<string>()
  const result: PerformanceRow[] = []

  for (const key of orderedKeys) {
    if (!blocks.has(key)) continue
    result.push(...blocks.get(key)!)
    seen.add(key)
  }

  for (const key of remainingKeys) {
    if (!seen.has(key)) {
      result.push(...blocks.get(key)!)
    }
  }

  result.push(...noKeyRows)
  return result
}

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
    setRows,
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
  const [rowOrderIds, setRowOrderIds] = useState<string[]>([])

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

  const displayRowIds = useMemo(
    () => displayRows.map((row) => row.id),
    [displayRows],
  )

  useEffect(() => {
    setRowOrderIds(displayRowIds)
  }, [displayRowIds])

  const orderedDisplayRows = useMemo(() => {
    const byId = new Map(displayRows.map((row) => [row.id, row]))
    return rowOrderIds
      .map((id) => byId.get(id))
      .filter((row): row is PerformanceSummaryRow => row != null)
  }, [displayRows, rowOrderIds])

  const isAggregateView =
    viewMode === "subProject" && !focusedSubProject
  const enableRowReorder = orderedDisplayRows.length > 1

  const dragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const handleRowDragEnd = (event: DragEndEvent) => {
    if (!enableRowReorder) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rowOrderIds.indexOf(String(active.id))
    const newIndex = rowOrderIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    const nextOrder = arrayMove(rowOrderIds, oldIndex, newIndex)
    setRowOrderIds(nextOrder)
    setRows((prev) =>
      reorderInputRowsBySummaryOrder(prev, nextOrder, isAggregateView),
    )
  }

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
    return orderedDisplayRows.reduce(
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
  }, [orderedDisplayRows, displayMonths])

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
          <DndContext
            sensors={dragSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleRowDragEnd}
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
                  stickyIndex={0}
                  compact={isCompactMonthView}
                  dataColumnCount={dataColumnCount}
                  className="bg-slate-100 text-left"
                >
                  세부사업명 · 상세분류
                </Th>
                <Th
                  colSpan={3}
                  stickyTotalSpan
                  compact={isCompactMonthView}
                  dataColumnCount={dataColumnCount}
                  className="bg-slate-100"
                >
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
                <SubHeader
                  stickyMetricIndices={[1, 2, 3]}
                  compact={isCompactMonthView}
                  dataColumnCount={dataColumnCount}
                />
                {displayMonths.map((month, index) => (
                  <SubHeader key={month} blue={index % 2 === 0} />
                ))}
              </tr>
            </thead>

            <tbody>
              <tr className="bg-sky-100 font-bold">
                <StickyTd
                  compact={isCompactMonthView}
                  stickyIndex={0}
                  dataColumnCount={dataColumnCount}
                  className="bg-sky-100"
                >
                  합계
                </StickyTd>
                <MetricCells
                  metrics={summaryMetrics}
                  variant={variant}
                  planMetrics={totals.plan}
                  getProgressRate={getProgressRate}
                  getProgressColor={getProgressColor}
                  strong
                  stickyMetrics
                  stickyCellClassName="bg-sky-100"
                  compact={isCompactMonthView}
                  dataColumnCount={dataColumnCount}
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

              <SortableContext
                items={rowOrderIds}
                strategy={verticalListSortingStrategy}
              >
                {orderedDisplayRows.map((row) => {
                  const total = getMetrics(row)
                  const planTotal = row.plan.total
                  const isAggregate =
                    viewMode === "subProject" &&
                    !isDrillDown &&
                    !row.detailCategory

                  return (
                    <SortableSummaryRow
                      key={row.id}
                      row={row}
                      enableDrag={enableRowReorder}
                      compact={isCompactMonthView}
                      dataColumnCount={dataColumnCount}
                      showDetailRows={showDetailRows}
                      isAggregate={isAggregate}
                      variant={variant}
                      displayMonths={displayMonths}
                      total={total}
                      planTotal={planTotal}
                      getMetrics={getMetrics}
                      getProgressRate={getProgressRate}
                      getProgressColor={getProgressColor}
                      onSubProjectClick={handleSubProjectClick}
                      onDetailClick={handleDetailClick}
                    />
                  )
                })}
              </SortableContext>
            </tbody>
          </table>
          </DndContext>
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

function SortableSummaryRow({
  row,
  enableDrag,
  compact,
  dataColumnCount,
  showDetailRows,
  isAggregate,
  variant,
  displayMonths,
  total,
  planTotal,
  getMetrics,
  getProgressRate,
  getProgressColor,
  onSubProjectClick,
  onDetailClick,
}: {
  row: PerformanceSummaryRow
  enableDrag: boolean
  compact: boolean
  dataColumnCount: number
  showDetailRows: boolean
  isAggregate: boolean
  variant: PerformanceSummaryVariant
  displayMonths: string[]
  total: Metrics
  planTotal: Metrics
  getMetrics: (row: PerformanceSummaryRow, month?: string) => Metrics
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
  onSubProjectClick: (subProject: string) => void
  onDetailClick: (subProject: string, detailCategory: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    disabled: !enableDrag,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:bg-sky-50/40",
        isDragging && "relative z-20 bg-sky-100/90 shadow-md",
      )}
      {...attributes}
    >
      <StickyTd
        compact={compact}
        stickyIndex={0}
        dataColumnCount={dataColumnCount}
        className="font-semibold"
      >
        <div className="flex items-start gap-1.5">
          {enableDrag ? (
            <button
              type="button"
              ref={setActivatorNodeRef}
              className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="행 순서 변경"
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
          <RowLabelCell
            row={row}
            showDetailRows={showDetailRows}
            isAggregate={isAggregate}
            onSubProjectClick={onSubProjectClick}
            onDetailClick={onDetailClick}
          />
        </div>
      </StickyTd>
      <MetricCells
        metrics={total}
        variant={variant}
        planMetrics={planTotal}
        fundingSources={row.fundingSources}
        getProgressRate={getProgressRate}
        getProgressColor={getProgressColor}
        stickyMetrics
        compact={compact}
        dataColumnCount={dataColumnCount}
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
  stickyMetrics,
  stickyCellClassName = "bg-white",
  compact = false,
  dataColumnCount = 3,
}: {
  metrics: Metrics
  variant: PerformanceSummaryVariant
  planMetrics: Metrics
  fundingSources?: FundingSourceCode[]
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
  strong?: boolean
  stickyMetrics?: boolean
  stickyCellClassName?: string
  compact?: boolean
  dataColumnCount?: number
}) {
  const stickyIndices: StickyColumnIndex[] = stickyMetrics ? [1, 2, 3] : []

  return (
    <>
      <Td
        right
        strong={strong}
        stickyIndex={stickyIndices[0]}
        compact={compact}
        dataColumnCount={dataColumnCount}
        className={cn(
          stickyIndices[0] !== undefined && stickyCellClassName,
          variant === "result"
            ? getProgressColor(planMetrics.people, metrics.people)
            : undefined,
        )}
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
        stickyIndex={stickyIndices[1]}
        compact={compact}
        dataColumnCount={dataColumnCount}
        className={cn(
          stickyIndices[1] !== undefined && stickyCellClassName,
          variant === "result"
            ? getProgressColor(planMetrics.count, metrics.count)
            : undefined,
        )}
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
      <Td
        right
        strong={strong}
        stickyIndex={stickyIndices[2]}
        compact={compact}
        dataColumnCount={dataColumnCount}
        className={stickyIndices[2] !== undefined ? stickyCellClassName : undefined}
      >
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

function SubHeader({
  blue,
  stickyMetricIndices,
  compact = false,
  dataColumnCount = 3,
}: {
  blue?: boolean
  stickyMetricIndices?: StickyColumnIndex[]
  compact?: boolean
  dataColumnCount?: number
}) {
  const bg = blue ? "bg-blue-50" : "bg-sky-50"
  const labels = ["인원(명)", "횟수(회)", "예산(원)"] as const

  return (
    <>
      {labels.map((label, index) => (
        <Th
          key={label}
          className={bg}
          stickyIndex={stickyMetricIndices?.[index]}
          compact={compact}
          dataColumnCount={dataColumnCount}
        >
          {label}
        </Th>
      ))}
    </>
  )
}

function Th({
  children,
  className = "",
  colSpan,
  rowSpan,
  stickyIndex,
  stickyTotalSpan,
  compact = false,
  dataColumnCount = 3,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
  rowSpan?: number
  stickyIndex?: StickyColumnIndex
  stickyTotalSpan?: boolean
  compact?: boolean
  dataColumnCount?: number
}) {
  const stickyStyle = stickyTotalSpan
    ? stickySpanStyle(compact, dataColumnCount)
    : stickyIndex !== undefined
      ? stickyLeftStyle(stickyIndex, compact, dataColumnCount)
      : undefined

  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={stickyStyle}
      className={cn(
        "border border-slate-300 px-4 py-3 text-center font-bold whitespace-nowrap",
        (stickyIndex !== undefined || stickyTotalSpan) &&
          "sticky z-20 shadow-[2px_0_0_0_rgba(226,232,240,1)]",
        stickyIndex === 0 && !compact && "min-w-[330px]",
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
  stickyIndex,
  compact = false,
  dataColumnCount = 3,
}: {
  children?: React.ReactNode
  className?: string
  right?: boolean
  strong?: boolean
  stickyIndex?: StickyColumnIndex
  compact?: boolean
  dataColumnCount?: number
}) {
  const stickyStyle =
    stickyIndex !== undefined
      ? stickyLeftStyle(stickyIndex, compact, dataColumnCount)
      : undefined

  return (
    <td
      style={stickyStyle}
      className={cn(
        "border border-slate-300 px-4 py-4 whitespace-nowrap align-middle",
        right && "text-right",
        strong && "font-bold",
        stickyIndex !== undefined &&
          "sticky z-10 bg-white shadow-[2px_0_0_0_rgba(226,232,240,1)]",
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
  stickyIndex = 0,
  dataColumnCount = 3,
}: {
  children?: React.ReactNode
  className?: string
  compact?: boolean
  stickyIndex?: StickyColumnIndex
  dataColumnCount?: number
}) {
  return (
    <td
      style={stickyLeftStyle(stickyIndex, compact, dataColumnCount)}
      className={cn(
        "border border-slate-300 bg-white px-4 py-4 text-left",
        "sticky z-10 shadow-[2px_0_0_0_rgba(226,232,240,1)]",
        compact
          ? "min-w-0 whitespace-normal break-words"
          : "min-w-[330px] whitespace-nowrap",
        className,
      )}
    >
      {children}
    </td>
  )
}
