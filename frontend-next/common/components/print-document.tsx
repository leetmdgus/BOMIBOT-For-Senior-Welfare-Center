"use client"

import { useEffect, useState, type ReactNode } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Loader2, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { flushRichTextEditorsAndWait } from "@/lib/prepare-print-area-html"
import { printPrintArea } from "@/lib/print-print-area"
import { cn } from "@/lib/utils"

/** 인쇄 시에만 표시 */
export function PrintOnly({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("print-only", className)}>{children}</div>
}

/** 화면에서만 표시 (인쇄 제외) */
export function ScreenOnly({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("screen-only", className)}>{children}</div>
}

export function PrintDocumentHeader({
  title,
  subtitle,
  meta,
  className,
}: {
  title: string
  subtitle?: string
  meta?: string
  className?: string
}) {
  const printedAt = format(new Date(), "yyyy.MM.dd HH:mm", { locale: ko })

  return (
    <header
      className={cn(
        "print-document-chrome-header print-only border-b-2 border-gray-800 pb-4 mb-6",
        className,
      )}
    >
      <h1 className="text-xl font-bold tracking-tight text-gray-900">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-base font-medium text-gray-700">{subtitle}</p>
      ) : null}
      <p className="mt-2 text-xs text-gray-500">
        {meta ? `${meta} · ` : ""}
        인쇄일시 {printedAt}
      </p>
    </header>
  )
}

/** 브라우저 A4 인쇄 (한글 .hwpx 다운로드와 별개) */
export function PrintDocumentButton({
  className,
  label = "인쇄",
  loadingLabel = "인쇄 준비 중…",
  disabled = false,
}: {
  className?: string
  label?: string
  loadingLabel?: string
  disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    void (async () => {
      setLoading(true)
      try {
        await flushRichTextEditorsAndWait()
        printPrintArea()
      } catch (error) {
        console.error("인쇄 실패:", error)
        alert(
          error instanceof Error
            ? `인쇄 준비에 실패했습니다.\n${error.message}`
            : "인쇄 준비에 실패했습니다.",
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
        <Printer className="mr-2 size-4" />
      )}
      {loading ? loadingLabel : label}
    </Button>
  )
}

/** 인쇄 대상 문서 래퍼 (본문만; HWPX 양식은 문서 내 제목 사용) */
export function PrintDocumentShell({
  title,
  subtitle,
  meta,
  children,
  className,
  /** true일 때만 인쇄 전용 머리글(제목·인쇄일시) 표시 */
  showPrintHeader = false,
}: {
  title?: string
  subtitle?: string
  meta?: string
  children: ReactNode
  className?: string
  showPrintHeader?: boolean
}) {
  usePrintDocument()

  return (
    <div className={cn("print-document-root space-y-6", className)}>
      {showPrintHeader && title ? (
        <PrintDocumentHeader title={title} subtitle={subtitle} meta={meta} />
      ) : null}
      {children}
    </div>
  )
}

/** 인쇄 전후 body 클래스 (인쇄 전용 스타일 트리거) */
export function usePrintDocument() {
  useEffect(() => {
    const onBefore = () => document.body.classList.add("is-printing")
    const onAfter = () => document.body.classList.remove("is-printing")

    window.addEventListener("beforeprint", onBefore)
    window.addEventListener("afterprint", onAfter)

    return () => {
      window.removeEventListener("beforeprint", onBefore)
      window.removeEventListener("afterprint", onAfter)
      document.body.classList.remove("is-printing")
    }
  }, [])
}
