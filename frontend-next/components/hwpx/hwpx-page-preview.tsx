"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { DEFAULT_HWP_PAGE } from "@/lib/hwp-ast/types"
import { cn } from "@/lib/utils"

const PAGE_WIDTH = DEFAULT_HWP_PAGE.width

type HwpxPagePreviewProps = {
  html: string | null
  loading?: boolean
  error?: string | null
  className?: string
  emptyMessage?: string
}

/**
 * HWPX render_json + A4 page canvas HTML iframe 미리보기.
 */
export function HwpxPagePreview({
  html,
  loading = false,
  error = null,
  className,
  emptyMessage = "미리보기를 불러오면 한글 양식에 가까운 A4 페이지가 표시됩니다.",
}: HwpxPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(720)

  useEffect(() => {
    const iframe = iframeRef.current
    const container = containerRef.current
    if (!iframe || !container || !html) return

    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(html)
    doc.close()

    const measure = () => {
      const pageEl = doc.querySelector<HTMLElement>(".hwpx-page")
      const rootEl = doc.querySelector<HTMLElement>(".hwpx-page-root")
      if (!pageEl) return

      const availableWidth = Math.max(container.clientWidth, 320)
      const scale = Math.min(1, availableWidth / PAGE_WIDTH)
      if (rootEl) {
        rootEl.style.transform = scale < 1 ? `scale(${scale})` : ""
        rootEl.style.transformOrigin = "top center"
        rootEl.style.width = scale < 1 ? `${PAGE_WIDTH}px` : ""
        rootEl.style.margin = scale < 1 ? "0 auto" : ""
      }

      const contentHeight = Math.max(
        pageEl.offsetHeight,
        pageEl.scrollHeight,
        doc.body?.scrollHeight ?? 0,
      )
      setHeight(Math.max(480, Math.ceil(contentHeight * scale) + 24))
    }

    measure()
    const timer = window.setTimeout(measure, 150)

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null
    observer?.observe(container)

    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
    }
  }, [html])

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin" />
        한글 양식 미리보기 생성 중…
      </div>
    )
  }

  if (error) {
    return (
      <p className={cn("py-16 text-center text-sm text-destructive", className)}>
        {error}
      </p>
    )
  }

  if (!html) {
    return (
      <p className={cn("py-16 text-center text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-x-hidden overflow-y-auto bg-[#e8e8e8]", className)}
      style={{ minHeight: height }}
    >
      <iframe
        ref={iframeRef}
        title="HWPX 미리보기"
        className="w-full border-0 bg-transparent"
        style={{ height, display: "block" }}
        sandbox="allow-same-origin"
      />
    </div>
  )
}
