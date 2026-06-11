"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { flushRichTextEditorsAndWait } from "@/lib/prepare-print-area-html"
import { printPrintArea } from "@/lib/print-print-area"
import { cn } from "@/lib/utils"

type PdfDownloadButtonProps = {
  label?: string
  loadingLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * 인쇄영역(.print-area)을 브라우저 인쇄→PDF 저장으로 다운로드.
 * 클릭 시 인쇄 대화상자가 열리며, 「대상」을 「PDF로 저장」으로 선택하면
 * 인쇄와 동일한 A4 레이아웃의 PDF 파일이 저장됩니다.
 */
export function PdfDownloadButton({
  label = "PDF 다운로드",
  loadingLabel = "PDF 준비 중…",
  disabled = false,
  className,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    void (async () => {
      setLoading(true)
      try {
        await flushRichTextEditorsAndWait()
        printPrintArea()
      } catch (error) {
        console.error("PDF 다운로드 실패:", error)
        alert(
          error instanceof Error
            ? `PDF 생성에 실패했습니다.\n${error.message}`
            : "PDF 생성에 실패했습니다.",
        )
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("print-hide", className)}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 size-4" />
      )}
      {loading ? loadingLabel : label}
    </Button>
  )
}
