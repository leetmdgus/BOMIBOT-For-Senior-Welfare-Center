"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { PanelRight, PanelRightClose } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

import { useStickySidePanel } from "@/components/kanban/task-detail/use-sticky-side-panel"

const STORAGE_SPLIT = "bomi-eval-plan-split-percent"
const STORAGE_VISIBLE = "bomi-eval-plan-panel-visible-v2"
const DEFAULT_SPLIT = 42
const MIN_SPLIT = 28
const MAX_SPLIT = 55

type EvaluationSplitLayoutProps = {
  /** 좌측: 평가서 (메인) */
  left: ReactNode
  /** 우측: 참고 사업계획서 */
  right: ReactNode
  className?: string
  /** 우측 사업계획서 패널 기본 표시 */
  defaultShowPlanPanel?: boolean
}

function readStoredSplit(): number {
  if (typeof window === "undefined") return DEFAULT_SPLIT
  const raw = window.localStorage.getItem(STORAGE_SPLIT)
  const n = raw ? Number(raw) : DEFAULT_SPLIT
  return Number.isFinite(n) ? Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, n)) : DEFAULT_SPLIT
}

function readStoredVisible(fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(STORAGE_VISIBLE)
  if (raw === null) return fallback
  return raw === "1"
}

/**
 * 사업평가 분할 — 좌: 평가서(메인), 우: 참고 계획서(스크롤 시 sticky)
 */
export function EvaluationSplitLayout({
  left,
  right,
  className,
  defaultShowPlanPanel = true,
}: EvaluationSplitLayoutProps) {
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT)
  const [showPlanPanel, setShowPlanPanel] = useState(defaultShowPlanPanel)
  const [hydrated, setHydrated] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const stickyEnabled = showPlanPanel && hydrated
  const { anchorRef, panelWrapStyle, isPinned, stickyMetrics } =
    useStickySidePanel(stickyEnabled, containerRef)

  const sidePanelStyle: CSSProperties | undefined = isPinned
    ? panelWrapStyle
    : {
        top: stickyMetrics.scrollTopPx,
        maxHeight: `calc(100vh - ${stickyMetrics.viewportTopPx}px - 0.5rem)`,
      }

  useEffect(() => {
    setSplitPercent(readStoredSplit())
    setShowPlanPanel(readStoredVisible(defaultShowPlanPanel))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_SPLIT, String(splitPercent))
  }, [splitPercent, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_VISIBLE, showPlanPanel ? "1" : "0")
  }, [showPlanPanel, hydrated])

  const startResize = useCallback(
    (clientX: number) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const startX = clientX
      const startPercent = splitPercent

      setIsDragging(true)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      const onMove = (event: MouseEvent) => {
        const delta = event.clientX - startX
        const next = startPercent - (delta / rect.width) * 100
        setSplitPercent(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, next)))
      }

      const onUp = () => {
        setIsDragging(false)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [splitPercent],
  )

  const planWidthStyle: CSSProperties | undefined = hydrated
    ? { width: `${splitPercent}%` }
    : undefined

  return (
    <div className={cn("space-y-3", className)}>
      <div className="evaluation-split-layout__chrome print-hide flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <Button
          type="button"
          variant={showPlanPanel ? "secondary" : "outline"}
          size="sm"
          className="h-8 shrink-0 text-xs"
          onClick={() => setShowPlanPanel((v) => !v)}
        >
          {showPlanPanel ? (
            <PanelRightClose className="mr-1.5 size-3.5" />
          ) : (
            <PanelRight className="mr-1.5 size-3.5" />
          )}
          {showPlanPanel ? "참고 계획서 닫기" : "참고 계획서 보기"}
        </Button>

        {showPlanPanel ? (
          <div className="flex min-w-[160px] flex-1 items-center gap-2">
            <span className="shrink-0 text-[11px] text-muted-foreground">
              평가서 {Math.round(100 - splitPercent)}% · 참고{" "}
              {Math.round(splitPercent)}%
            </span>
            <Slider
              value={[splitPercent]}
              min={MIN_SPLIT}
              max={MAX_SPLIT}
              step={1}
              className="max-w-[200px] flex-1"
              onValueChange={([value]) => {
                if (value !== undefined) setSplitPercent(value)
              }}
            />
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            참고 계획서를 켜면 사업계획서 전체(본문 포함)를 보며 평가서를 작성할 수 있습니다.
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className={cn(
          "print-document flex w-full",
          showPlanPanel
            ? "flex-col gap-4 md:flex-row md:items-start md:gap-3"
            : "flex-col",
        )}
      >
        <div
          data-eval-main-column
          className="min-w-0 flex-1"
        >
          {left}
        </div>

        {showPlanPanel ? (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="패널 너비 조절"
              className={cn(
                "print-hide mx-0.5 hidden shrink-0 cursor-col-resize md:flex md:flex-col",
                !isPinned && "md:sticky md:z-40",
                "items-center justify-center self-start",
              )}
              style={
                !isPinned
                  ? { top: stickyMetrics.scrollTopPx }
                  : undefined
              }
              onMouseDown={(event) => startResize(event.clientX)}
            >
              <div
                className={cn(
                  "flex h-28 w-2 items-center justify-center rounded-full",
                  isDragging
                    ? "bg-primary/50"
                    : "bg-border/80 hover:bg-primary/25",
                )}
              >
                <div className="h-12 w-1 rounded-full bg-muted-foreground/50" />
              </div>
            </div>

            <div
              ref={anchorRef}
              className="plan-floating-panel reference-plan-panel print-hide w-full shrink-0 md:min-w-[min(100%,280px)] md:max-w-[48%] md:shrink-0"
              style={planWidthStyle}
            >
              <div
                className={cn(
                  "w-full",
                  !isPinned && "md:sticky md:z-30 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto",
                )}
                style={sidePanelStyle}
              >
                {right}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
