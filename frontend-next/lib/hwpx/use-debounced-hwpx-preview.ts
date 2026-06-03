import { useEffect, useRef, useState } from "react"

type UseDebouncedHwpxPreviewOptions = {
  enabled: boolean
  debounceMs?: number
  /** 변경 시 미리보기 재요청 (예: JSON.stringify(payload)) */
  revisionKey: string
  fetchPreview: () => Promise<string>
}

export function useDebouncedHwpxPreview({
  enabled,
  debounceMs = 600,
  revisionKey,
  fetchPreview,
}: UseDebouncedHwpxPreviewOptions) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchRef = useRef(fetchPreview)
  fetchRef.current = fetchPreview

  useEffect(() => {
    if (!enabled) {
      setHtml(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      void fetchRef
        .current()
        .then((next) => {
          if (!cancelled) {
            setHtml(next)
            setError(null)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setHtml(null)
            setError(
              err instanceof Error
                ? err.message
                : "한글 미리보기를 불러오지 못했습니다.",
            )
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, debounceMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, debounceMs, revisionKey])

  return { html, loading, error }
}
