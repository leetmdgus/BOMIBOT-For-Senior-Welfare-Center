"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type HwpxPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** 열릴 때 서버 HWPX 미리보기 HTML 을 가져온다 */
  fetchHtml: () => Promise<string>
}

/**
 * 선택한 양식(기본/업로드)을 실제 서버 렌더로 보는 미리보기 다이얼로그.
 * 좌측 라이브 편집 미러와 달리, 다운로드와 동일한 HWPX 파이프라인 결과를 iframe 으로 표시한다.
 */
export function HwpxPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  fetchHtml,
}: HwpxPreviewDialogProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // fetchHtml 은 매 렌더마다 새 함수일 수 있어 ref 로 고정 — 열릴 때 1회만 요청
  const fetchRef = useRef(fetchHtml)
  fetchRef.current = fetchHtml

  useEffect(() => {
    if (!open) {
      setHtml(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRef
      .current()
      .then((result) => {
        if (!cancelled) setHtml(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열릴 때 1회만 요청 (fetchHtml 은 ref 로 고정)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="h-[70vh] w-full overflow-hidden rounded-md border bg-neutral-100">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              미리보기를 만드는 중…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-500">
              미리보기를 불러오지 못했습니다.
              <br />
              {error}
            </div>
          ) : html ? (
            <iframe
              title={title}
              srcDoc={html}
              className="h-full w-full border-0 bg-white"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HwpxPreviewDialog
