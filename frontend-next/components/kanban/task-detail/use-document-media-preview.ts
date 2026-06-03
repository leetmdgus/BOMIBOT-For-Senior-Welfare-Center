"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchFileBlobUrl } from "@/lib/kanban/document-media"

export function useDocumentMediaPreview(fileId?: string) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const localUrlRef = useRef<string | null>(null)

  const revokeLocal = useCallback(() => {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current)
      localUrlRef.current = null
    }
  }, [])

  const setLocalFile = useCallback(
    (file: File) => {
      revokeLocal()
      const objectUrl = URL.createObjectURL(file)
      localUrlRef.current = objectUrl
      setUrl(objectUrl)
      setError(null)
      setLoading(false)
    },
    [revokeLocal],
  )

  useEffect(() => {
    revokeLocal()
    setUrl(null)
    setError(null)

    if (!fileId || fileId.startsWith("local-")) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void fetchFileBlobUrl(fileId)
      .then((objectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        localUrlRef.current = objectUrl
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "미리보기를 불러오지 못했습니다.",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      revokeLocal()
    }
  }, [fileId, revokeLocal])

  return { url, loading, error, setLocalFile }
}
