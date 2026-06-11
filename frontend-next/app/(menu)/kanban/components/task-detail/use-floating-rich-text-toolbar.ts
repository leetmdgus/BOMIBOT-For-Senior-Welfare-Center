"use client"

import { useEffect, useState, type RefObject } from "react"

const FLOAT_BOTTOM_GAP_PX = 16

export type FloatingToolbarLayout = {
  left: number
  width: number
  bottom: number
  ready: boolean
}

function resolveWidthRoot(anchor: HTMLElement | null): HTMLElement | null {
  if (!anchor) return null
  return (
    anchor.closest(".print-document-root") ??
    anchor.closest("[data-rich-toolbar-width-root]") ??
    anchor
  )
}

/** 사업계획서와 동일한 문서 폭(.print-document-root)에 맞춘 하단 플로팅 툴바 */
export function useFloatingRichTextToolbar(
  anchorRef: RefObject<HTMLElement | null>,
): FloatingToolbarLayout {
  const [layout, setLayout] = useState<FloatingToolbarLayout>({
    left: 0,
    width: 0,
    bottom: FLOAT_BOTTOM_GAP_PX,
    ready: false,
  })

  useEffect(() => {
    const scrollRoot = document.getElementById("task-detail-scroll")

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const widthRoot = resolveWidthRoot(anchor)
      const rect = widthRoot?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return

      setLayout({
        left: rect.left,
        width: rect.width,
        bottom: FLOAT_BOTTOM_GAP_PX,
        ready: true,
      })
    }

    update()

    scrollRoot?.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)

    const ro = new ResizeObserver(update)
    if (scrollRoot) ro.observe(scrollRoot)
    const anchor = anchorRef.current
    const widthRoot = resolveWidthRoot(anchor)
    if (widthRoot) ro.observe(widthRoot)
    if (anchor) ro.observe(anchor)

    return () => {
      scrollRoot?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      ro.disconnect()
    }
  }, [anchorRef])

  return layout
}

export const FLOATING_TOOLBAR_BOTTOM_GAP_PX = FLOAT_BOTTOM_GAP_PX
