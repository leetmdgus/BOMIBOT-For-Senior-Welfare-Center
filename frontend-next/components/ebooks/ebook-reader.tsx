"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ExternalLink, Loader2, Printer } from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { Button } from "@/components/ui/button"
import {
  apiFetchBlobWithMeta,
  apiFetchText,
  resolveApiPath,
} from "@/lib/api-client"
import { getEbook } from "@/services/ebooks.service"
import type { BookDetail } from "@/services/ebooks.types"

type Mode = "html" | "pdf"

export function EbookReader() {
  const params = useParams()
  const bookId = typeof params.id === "string" ? params.id : ""

  const [book, setBook] = useState<BookDetail | null>(null)
  const [mode, setMode] = useState<Mode>("html")
  const [html, setHtml] = useState<string>("")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!bookId) return
    let active = true
    let objectUrl: string | null = null
    setIsLoading(true)
    setError(null)
    setHtml("")
    setPdfUrl(null)

    const htmlPath = resolveApiPath(
      `/api/ebooks/${bookId}/html`,
      `/api/v1/ebooks/${bookId}/html`,
    )
    const pdfPath = resolveApiPath(
      `/api/ebooks/${bookId}/pdf`,
      `/api/v1/ebooks/${bookId}/pdf`,
    )

    ;(async () => {
      try {
        const detail = await getEbook(bookId).catch(() => null)
        if (active) setBook(detail)

        if (detail?.isUploadedPdf) {
          const { blob } = await apiFetchBlobWithMeta(pdfPath)
          if (!active) return
          objectUrl = URL.createObjectURL(blob)
          setPdfUrl(objectUrl)
          setMode("pdf")
        } else {
          const markup = await apiFetchText(htmlPath)
          if (!active) return
          setHtml(markup)
          setMode("html")
        }
      } catch (err) {
        console.error("연간 보고서 로드 실패:", err)
        if (active) setError("보고서를 불러오지 못했습니다.")
      } finally {
        if (active) setIsLoading(false)
      }
    })()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bookId])

  const ready = mode === "pdf" ? Boolean(pdfUrl) : Boolean(html)

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  const handleOpenNewTab = () => {
    if (mode === "pdf") {
      if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer")
      return
    }
    if (!html) return
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }))
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href="/ebooks"
                className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                연간 보고서 목록
              </Link>
              <h1 className="text-2xl font-bold">{book?.title ?? "연간 보고서"}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {book?.team ?? ""}
                {book?.year ? ` · ${book.year}년` : ""}
                {book?.entries ? ` · 사업 ${book.entries.length}건` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!ready}
                onClick={handleOpenNewTab}
              >
                <ExternalLink className="size-4" />
                새 창에서 열기
              </Button>
              <Button
                size="sm"
                className="gap-2"
                disabled={!ready}
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                인쇄 · PDF 저장
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-xl border border-border bg-muted/30">
            {isLoading ? (
              <div className="flex h-full min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                보고서를 렌더링하는 중…
              </div>
            ) : error ? (
              <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-destructive">
                {error}
              </div>
            ) : mode === "pdf" && pdfUrl ? (
              <iframe
                ref={iframeRef}
                title={book?.title ?? "전자책"}
                src={pdfUrl}
                className="size-full min-h-[70vh] bg-white"
              />
            ) : mode === "html" && html ? (
              <iframe
                ref={iframeRef}
                title={book?.title ?? "연간 보고서"}
                srcDoc={html}
                className="size-full min-h-[70vh] bg-white"
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
