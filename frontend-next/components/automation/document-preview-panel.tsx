"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { HwpxRenderer } from "@/components/hwpx/HwpxRenderer"
import type { DocumentAnalysisResult } from "@/lib/automation/document-analysis-types"
import type { HwpxFrontendDocument } from "@/lib/hwpx/frontend-render-types"
import { cn } from "@/lib/utils"

type DocumentPreviewPanelProps = {
  analysis: DocumentAnalysisResult | null
  hwpxPreview: HwpxFrontendDocument | null
  loading?: boolean
  className?: string
}

export function DocumentPreviewPanel({
  analysis,
  hwpxPreview,
  loading = false,
  className,
}: DocumentPreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(640)

  useEffect(() => {
    if (!analysis?.previewHtml || analysis.kind === "hwpx") return

    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument
    if (!doc) return

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/></head><body>${analysis.previewHtml}</body></html>`
    doc.open()
    doc.write(html)
    doc.close()

    const measure = () => {
      setIframeHeight(
        Math.max(480, doc.body?.scrollHeight ?? 640, doc.documentElement?.scrollHeight ?? 640),
      )
    }

    measure()
    const timer = window.setTimeout(measure, 120)
    return () => window.clearTimeout(timer)
  }, [analysis])

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin" />
        문서를 분석하는 중…
      </div>
    )
  }

  if (!analysis) {
    return (
      <p
        className={cn(
          "py-24 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        트리에서 파일을 선택하면 미리보기가 표시됩니다.
      </p>
    )
  }

  if (analysis.kind === "hwpx" && hwpxPreview) {
    return (
      <div className={cn("overflow-auto", className)}>
        <HwpxRenderer data={hwpxPreview} />
      </div>
    )
  }

  if (analysis.previewHtml) {
    return (
      <iframe
        ref={iframeRef}
        title={analysis.filename}
        className={cn("w-full border-0 bg-white", className)}
        style={{ height: iframeHeight, minHeight: 480 }}
        sandbox="allow-same-origin"
      />
    )
  }

  return (
    <p className={cn("py-24 text-center text-sm text-muted-foreground", className)}>
      {analysis.supported
        ? "이 형식은 텍스트 요약만 제공됩니다."
        : analysis.summary}
    </p>
  )
}
