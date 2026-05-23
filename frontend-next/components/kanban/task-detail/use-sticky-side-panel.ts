"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react"

const STICKY_GAP_PX = 8

export type TaskDetailStickyMetrics = {
  /** #task-detail-scroll 뷰포트 기준 sticky top (px) */
  scrollTopPx: number
  /** position:fixed용 viewport top (px) */
  viewportTopPx: number
}

/** 스크롤 영역 안에서 아직 보이는 헤더·탭 아래에 패널을 붙임 */
export function measureTaskDetailStickyTop(
  scrollRoot: HTMLElement,
): TaskDetailStickyMetrics {
  const rootRect = scrollRoot.getBoundingClientRect()
  let chromeBottom = rootRect.top

  for (const child of scrollRoot.children) {
    if (!(child instanceof HTMLElement)) continue
    if (child.tagName === "MAIN") break
    const rect = child.getBoundingClientRect()
    if (rect.bottom > rootRect.top) {
      chromeBottom = Math.max(chromeBottom, rect.bottom)
    }
  }

  const scrollTopPx = Math.round(chromeBottom - rootRect.top + STICKY_GAP_PX)
  const viewportTopPx = Math.round(chromeBottom + STICKY_GAP_PX)

  return { scrollTopPx, viewportTopPx }
}

type StickySidePanelState = {
  anchorRef: React.RefObject<HTMLDivElement | null>
  panelWrapStyle: CSSProperties | undefined
  isPinned: boolean
  stickyMetrics: TaskDetailStickyMetrics
}

/**
 * 메인 스크롤 영역(#task-detail-scroll) 안에서 좌측 패널을 viewport에 고정.
 * 우측을 길게 스크롤해도 계획서가 화면 상단(헤더·탭 바로 아래)에 붙어 따라옴.
 */
export function useStickySidePanel(
  enabled: boolean,
  rowRef?: RefObject<HTMLDivElement | null>,
): StickySidePanelState {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [panelWrapStyle, setPanelWrapStyle] = useState<
    CSSProperties | undefined
  >(undefined)
  const [isPinned, setIsPinned] = useState(false)
  const [stickyMetrics, setStickyMetrics] = useState<TaskDetailStickyMetrics>({
    scrollTopPx: STICKY_GAP_PX,
    viewportTopPx: STICKY_GAP_PX,
  })

  const update = useCallback(() => {
    const scrollRoot = document.getElementById("task-detail-scroll")
    if (!scrollRoot) return

    const metrics = measureTaskDetailStickyTop(scrollRoot)
    setStickyMetrics(metrics)

    if (!enabled) {
      setPanelWrapStyle(undefined)
      setIsPinned(false)
      return
    }

    const anchor = anchorRef.current
    if (!anchor) {
      setPanelWrapStyle(undefined)
      setIsPinned(false)
      return
    }

    const anchorRect = anchor.getBoundingClientRect()
    const rowRect = rowRef?.current?.getBoundingClientRect() ?? anchorRect
    const { viewportTopPx } = metrics

    const rowTop = anchorRect.top
    const rowBottom = rowRect.bottom
    const pinStart = rowTop <= viewportTopPx
    const pinEnd = rowBottom <= viewportTopPx + 48
    const shouldPin = pinStart && !pinEnd

    if (!shouldPin) {
      setPanelWrapStyle(undefined)
      setIsPinned(false)
      return
    }

    setIsPinned(true)
    setPanelWrapStyle({
      position: "fixed",
      top: viewportTopPx,
      left: anchorRect.left,
      width: anchorRect.width,
      zIndex: 35,
      maxHeight: `calc(100vh - ${viewportTopPx}px - ${STICKY_GAP_PX}px)`,
      overflowY: "auto",
      overscrollBehavior: "contain",
    })
  }, [enabled])

  useEffect(() => {
    update()

    const scrollRoot = document.getElementById("task-detail-scroll")
    if (!scrollRoot) return

    scrollRoot.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)

    const ro = new ResizeObserver(update)
    ro.observe(scrollRoot)
    for (const child of scrollRoot.children) {
      if (child instanceof HTMLElement) ro.observe(child)
    }

    const anchor = anchorRef.current
    if (anchor) ro.observe(anchor)
    const row = rowRef?.current
    if (row) ro.observe(row)

    return () => {
      scrollRoot.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      ro.disconnect()
    }
  }, [update])

  return { anchorRef, panelWrapStyle, isPinned, stickyMetrics }
}
