"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type HwpxDownloadButtonProps = {
  label?: string
  onDownload: () => Promise<void>
  disabled?: boolean
  className?: string
}

export function HwpxDownloadButton({
  label = "한글 다운로드",
  onDownload,
  disabled = false,
  className,
}: HwpxDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
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
        <FileDown className="mr-2 size-4" />
      )}
      {loading ? "생성 중…" : label}
    </Button>
  )
}
