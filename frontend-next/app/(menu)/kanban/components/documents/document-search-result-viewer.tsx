"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"

import { HwpxPagePreview } from "@common/components/hwpx/hwpx-page-preview"
import { OfficePreviewContent } from "@common/components/office-preview-content"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  loadBusinessDocumentPreview,
  type BusinessDocumentPreview,
} from "@/lib/kanban/load-business-document-preview"
import type { BusinessDocumentSearchResult } from "@/services/kanban.documents-search.types"

type DocumentSearchResultViewerProps = {
  result: BusinessDocumentSearchResult | null
  onOpenChange: (open: boolean) => void
}

export function DocumentSearchResultViewer({
  result,
  onOpenChange,
}: DocumentSearchResultViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<BusinessDocumentPreview | null>(null)

  useEffect(() => {
    if (!result) {
      setPreview(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let activeBlobUrl: string | null = null

    setLoading(true)
    setError(null)
    setPreview(null)

    void loadBusinessDocumentPreview(result)
      .then((loaded) => {
        if (cancelled) {
          if (
            loaded.mode === "image" ||
            loaded.mode === "pdf" ||
            loaded.mode === "video"
          ) {
            URL.revokeObjectURL(loaded.blobUrl)
          }
          return
        }
        if (
          loaded.mode === "image" ||
          loaded.mode === "pdf" ||
          loaded.mode === "video"
        ) {
          activeBlobUrl = loaded.blobUrl
        }
        setPreview(loaded)
      })
      .catch((err) => {
        console.error("[document-search-viewer]", err)
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "문서 미리보기를 불러오지 못했습니다.",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl)
    }
  }, [result])

  return (
    <Dialog open={Boolean(result)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-left text-base leading-snug">
                {result?.title ?? "문서 미리보기"}
              </DialogTitle>
              {result?.snippet ? (
                <p className="text-left text-xs text-muted-foreground line-clamp-2">
                  {result.snippet}
                </p>
              ) : null}
            </div>
            {result?.href ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={result.href}>
                  <ExternalLink className="mr-1.5 size-3.5" />
                  업무에서 열기
                </Link>
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div
          className={
            preview?.mode === "hwpx" || preview?.mode === "office"
              ? "min-h-0 flex-1 overflow-y-auto bg-[#e8e8e8] px-4 py-4"
              : "min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-4"
          }
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              문서를 불러오는 중…
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">{error}</p>
          ) : preview?.mode === "hwpx" ? (
            <HwpxPagePreview html={preview.html} />
          ) : preview?.mode === "office" ? (
            <OfficePreviewContent html={preview.html} className="max-h-none" />
          ) : preview?.mode === "image" ? (
            <figure className="flex flex-col items-center gap-2 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.blobUrl}
                alt={preview.name}
                className="max-h-[70vh] max-w-full rounded border bg-white object-contain"
              />
              <figcaption className="text-xs text-muted-foreground">
                {preview.name}
              </figcaption>
            </figure>
          ) : preview?.mode === "pdf" ? (
            <iframe
              title={preview.name}
              src={preview.blobUrl}
              className="h-[min(70vh,800px)] w-full rounded border bg-white"
            />
          ) : preview?.mode === "video" ? (
            <figure className="flex flex-col items-center gap-2 py-4">
              <video
                src={preview.blobUrl}
                controls
                className="max-h-[70vh] w-full max-w-full rounded border bg-black"
              >
                <track kind="captions" />
              </video>
              <figcaption className="text-xs text-muted-foreground">
                {preview.name}
              </figcaption>
            </figure>
          ) : preview?.mode === "unsupported" ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {preview.message}
            </p>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              미리보기를 준비 중입니다.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
