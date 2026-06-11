"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

type LiveHwpxRenderPanelProps = {
  /** 현재 내용·선택 양식으로 서버 HWPX 렌더 HTML 을 가져온다 */
  fetchHtml: () => Promise<string>
  /** 내용/양식이 바뀌면 값이 달라져 디바운스 후 재렌더 */
  refreshKey: string
  /** 편집 중 재요청 디바운스(ms) */
  debounceMs?: number
  label?: string
  className?: string
}

/**
 * 우측 실시간 HWPX 렌더 패널 — 좌측 편집기 내용을 다운로드와 동일한 파이프라인으로
 * 렌더해 iframe 으로 표시. 편집 시 디바운스 후 자동 갱신하며, 갱신 중에도 직전 결과를 유지.
 */
export function LiveHwpxRenderPanel({
  fetchHtml,
  refreshKey,
  debounceMs = 900,
  label = "한글(HWPX) 렌더링 · 읽기 전용",
  className,
}: LiveHwpxRenderPanelProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchRef = useRef(fetchHtml)
  fetchRef.current = fetchHtml
  const firstRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    const run = () => {
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
    }
    // 최초 1회는 즉시, 이후 편집은 디바운스
    if (firstRef.current) {
      firstRef.current = false
      run()
      return () => {
        cancelled = true
      }
    }
    const timer = window.setTimeout(run, debounceMs)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [refreshKey, debounceMs])

  return (
    <aside
      className={`flex h-full min-h-0 w-full flex-col ${className ?? ""}`}
      aria-label="HWPX 렌더링 미리보기"
    >
      <div className="mb-2 flex shrink-0 items-center gap-2 border border-black/20 bg-[#f2f2f2] px-3 py-2">
        <p className="truncate text-xs font-semibold">한글 양식 렌더링</p>
        <p className="text-[10px] text-neutral-600">{label}</p>
        {loading ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-neutral-500">
            <Loader2 className="size-3 animate-spin" />
            갱신 중…
          </span>
        ) : null}
      </div>

      <div className="min-h-[60vh] flex-1 overflow-hidden rounded-b-lg border border-t-0 border-border bg-neutral-100">
        {error && !html ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-500">
            렌더링을 불러오지 못했습니다.
            <br />
            {error}
          </div>
        ) : html ? (
          <iframe
            title="HWPX 렌더링"
            srcDoc={html}
            className="h-full min-h-[60vh] w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            렌더링 준비 중…
          </div>
        )}
      </div>
    </aside>
  )
}

export default LiveHwpxRenderPanel
