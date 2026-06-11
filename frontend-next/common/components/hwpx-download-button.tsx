"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { flushRichTextEditorsAndWait } from "@/lib/prepare-print-area-html"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type HwpxDownloadButtonProps = {
  label?: string
  loadingLabel?: string
  onDownload: () => Promise<void>
  disabled?: boolean
  className?: string
}

/** 한글(.hwpx) 파일 다운로드 — 브라우저 인쇄와 별개 */
export function HwpxDownloadButton({
  label = "한글 다운로드",
  loadingLabel = "한글 파일 생성 중…",
  onDownload,
  disabled = false,
  className,
}: HwpxDownloadButtonProps) {
  const resolvedLabel = label
  const resolvedLoadingLabel = loadingLabel
  const Icon = FileDown

  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await flushRichTextEditorsAndWait()
      await onDownload()
    } catch (error) {
      console.error("HWPX 다운로드 실패:", error)
      alert(
        error instanceof Error
          ? `한글(HWPX) 파일 생성에 실패했습니다.\n${error.message}`
          : "한글(HWPX) 파일 생성에 실패했습니다.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("print-hide", className)}
      disabled={disabled || loading}
      onClick={() => void handleClick()}
    >
      {loading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Icon className="mr-2 size-4" />
      )}
      {loading ? resolvedLoadingLabel : resolvedLabel}
    </Button>
  )
}
