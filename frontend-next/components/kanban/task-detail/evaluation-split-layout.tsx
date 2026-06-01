"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useStickySidePanel } from "@/components/kanban/task-detail/use-sticky-side-panel"

const STORAGE_VISIBLE = "bomi-eval-plan-panel-visible-v2"

type EvaluationSplitLayoutProps = {
  /** 우측: 작성(수정) 영역 */
  editor: ReactNode
  /** 좌측: 선택한 참고 문서 */
  referencePanel: ReactNode
  /** 상단 사업 문서 선택 UI */
  documentSelector?: ReactNode
  className?: string
  /** 참고 패널 기본 표시 */
  defaultShowReferencePanel?: boolean
  /** @deprecated use editor */
  evaluation?: ReactNode
  /** @deprecated use referencePanel */
  referencePlan?: ReactNode
  /** @deprecated use defaultShowReferencePanel */
  defaultShowPlanPanel?: boolean
}

function readStoredVisible(fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(STORAGE_VISIBLE)
  if (raw === null) return fallback
  return raw === "1"
}

/**
 * 사업평가 함께보기 — 좌: 참고 계획서(고정·스크롤), 우: 평가서(수정)
 */
export function EvaluationSplitLayout({
  editor,
  referencePanel,
  documentSelector,
  className,
  defaultShowReferencePanel = true,
  evaluation,
  referencePlan,
  defaultShowPlanPanel,
}: EvaluationSplitLayoutProps) {
  const resolvedEditor = editor ?? evaluation
  const resolvedReference = referencePanel ?? referencePlan
  const resolvedDefaultShow =
    defaultShowReferencePanel ?? defaultShowPlanPanel ?? true

  const [showPlanPanel, setShowPlanPanel] = useState(resolvedDefaultShow)
  const [hydrated, setHydrated] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const togetherActive = showPlanPanel && hydrated
  const { anchorRef, panelWrapStyle, isPinned, stickyMetrics } =
    useStickySidePanel(togetherActive, containerRef)

  const referencePanelStyle: CSSProperties | undefined = isPinned
    ? panelWrapStyle
    : {
        top: stickyMetrics.scrollTopPx,
        maxHeight: `calc(100vh - ${stickyMetrics.viewportTopPx}px - 0.5rem)`,
      }

  useEffect(() => {
    setShowPlanPanel(readStoredVisible(resolvedDefaultShow))
    setHydrated(true)
  }, [resolvedDefaultShow])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_VISIBLE, showPlanPanel ? "1" : "0")
  }, [showPlanPanel, hydrated])

  useEffect(() => {
    const scroll = document.getElementById("task-detail-scroll")
    if (!scroll || !hydrated) return

    const active = showPlanPanel
    if (active) {
      scroll.classList.add("has-evaluation-together-view")
    } else {
      scroll.classList.remove("has-evaluation-together-view")
    }

    return () => {
      scroll.classList.remove("has-evaluation-together-view")
    }
  }, [showPlanPanel, hydrated])

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
            <PanelLeftClose className="mr-1.5 size-3.5" />
          ) : (
            <PanelLeft className="mr-1.5 size-3.5" />
          )}
          {showPlanPanel ? "참고 문서 닫기" : "참고 문서 보기"}
        </Button>

        {!showPlanPanel ? (
          <span className="text-[11px] text-muted-foreground">
            참고 문서를 켜면 왼쪽에서 사업 문서를 보며 오른쪽에서 작성할 수
            있습니다.
          </span>
        ) : null}
      </div>

      {showPlanPanel && documentSelector ? (
        <div className="print-hide">{documentSelector}</div>
      ) : null}

      <div
        ref={containerRef}
        className={cn(
          "evaluation-together-layout print-document w-full min-w-0",
          showPlanPanel
            ? "evaluation-together-layout--split grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-3"
            : "flex flex-col",
        )}
      >
        {showPlanPanel ? (
          <div
            ref={anchorRef}
            data-eval-reference-column
            className="plan-floating-panel reference-plan-panel print-hide min-w-0 w-full"
          >
            <div
              className={cn(
                "reference-plan-panel__frame w-full",
                !isPinned &&
                  "md:sticky md:z-30 md:overflow-y-auto md:overscroll-contain",
              )}
              style={referencePanelStyle}
            >
              {resolvedReference}
            </div>
          </div>
        ) : null}

        <div
          data-eval-main-column
          className={cn("min-w-0 w-full", showPlanPanel && "md:min-w-0")}
        >
          {resolvedEditor}
        </div>
      </div>
    </div>
  )
}
