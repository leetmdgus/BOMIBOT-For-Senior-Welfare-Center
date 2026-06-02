"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, FileWarning, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OfficePreviewContent } from "@/components/files/office-preview-content"
import type { FileItem } from "@/components/files/file-types"
import {
  getFilePreviewKind,
  type FilePreviewKind,
} from "@/lib/files/open-file-item"
import { isOfficePreviewableFile } from "@/lib/files/office-preview"
import {
  loadOfficePreviewHtml,
  wrapOfficePreviewDocument,
} from "@/lib/files/office-preview"
import { downloadFileBlob, downloadFileToDisk } from "@/services/files.service"

type FilePreviewDialogProps = {
  item: FileItem | null
  onOpenChange: (open: boolean) => void
}

type PreviewState = {
  kind: FilePreviewKind
  html: string | null
  blobUrl: string | null
  text: string | null
  error: string | null
}

const EMPTY_PREVIEW: PreviewState = {
  kind: "unsupported",
  html: null,
  blobUrl: null,
  text: null,
  error: null,
}

export function FilePreviewDialog({
  item,
  onOpenChange,
}: FilePreviewDialogProps) {
  const previewKind = useMemo(
    () => (item ? getFilePreviewKind(item) : "unsupported"),
    [item],
  )
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (!item) {
      setPreview(EMPTY_PREVIEW)
      setLoading(false)
      return
    }

    const kind = getFilePreviewKind(item)
    if (kind === "seed" || kind === "missing") {
      setPreview({ ...EMPTY_PREVIEW, kind })
      setLoading(false)
      return
    }
    if (kind === "unsupported") {
      setPreview({ ...EMPTY_PREVIEW, kind: "unsupported" })
      setLoading(false)
      return
    }

    let cancelled = false

    setLoading(true)
    setPreview({ ...EMPTY_PREVIEW, kind })

    void (async () => {
      try {
        if (kind === "office") {
          const html = await loadOfficePreviewHtml(item.id, {
            name: item.name,
            hasContent: item.hasContent,
            contentMissing: item.contentMissing,
          })
          if (cancelled) return
          setPreview({ kind, html, blobUrl: null, text: null, error: null })
          return
        }

        if (!downloadFileBlob) {
          throw new Error("파일 API를 사용할 수 없습니다.")
        }

        const blob = await downloadFileBlob(item.id)

        if (kind === "text") {
          const text = await blob.text()
          if (cancelled) return
          setPreview({ kind, html: null, blobUrl: null, text, error: null })
          return
        }

        blobUrlRef.current = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
          return
        }
        setPreview({
          kind,
          html: null,
          blobUrl: blobUrlRef.current,
          text: null,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        setPreview({
          kind,
          html: null,
          blobUrl: null,
          text: null,
          error:
            err instanceof Error ? err.message : "미리보기를 불러오지 못했습니다.",
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [item?.id, item?.name, item?.hasContent, item?.contentMissing, item?.type, item?.mimeType])

  const openInNewTab = () => {
    if (!item) return
    if (preview.html) {
      const doc = wrapOfficePreviewDocument(preview.html, item.name)
      const blob = new Blob([doc], { type: "text/html;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (opened) {
        window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
      } else {
        URL.revokeObjectURL(url)
      }
      return
    }
    if (preview.blobUrl) {
      window.open(preview.blobUrl, "_blank", "noopener,noreferrer")
    }
  }

  const canOpenNewTab = Boolean(preview.html || preview.blobUrl)
  const canOpenInDesktopApp =
    Boolean(item?.hasContent) &&
    downloadFileToDisk != null &&
    isOfficePreviewableFile(item?.name ?? "", item?.type, item?.mimeType)

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center gap-2 pr-8">
            <DialogTitle className="truncate text-base">
              {item?.name ?? "미리보기"}
            </DialogTitle>
            <div className="ml-auto flex gap-1">
              {canOpenNewTab ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={openInNewTab}
                >
                  <ExternalLink className="size-3.5" />
                  새 탭
                </Button>
              ) : null}
              {item && downloadFileToDisk && item.hasContent ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => void downloadFileToDisk(item.id, item.name)}
                >
                  {canOpenInDesktopApp ? "PC에서 열기" : "다운로드"}
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[50vh] flex-1 overflow-auto bg-white p-4">
          {loading ? (
            <div className="flex h-full min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              미리보기 불러오는 중…
            </div>
          ) : preview.error ? (
            <p className="py-16 text-center text-sm text-destructive">
              {preview.error}
            </p>
          ) : previewKind === "missing" ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <FileWarning className="size-10 text-destructive" />
              <p>
                파일 본문을 서버에서 찾을 수 없습니다.
                <br />
                Docker 재빌드·저장소 초기화로 삭제되었을 수 있습니다.
                <br />
                같은 이름으로 다시 업로드해 주세요.
              </p>
            </div>
          ) : previewKind === "seed" ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <FileWarning className="size-10 text-amber-500" />
              <p>
                이 항목은 예시 데이터입니다.
                <br />
                「파일 업로드」로 올린 파일만 미리보기·다운로드할 수 있습니다.
              </p>
            </div>
          ) : previewKind === "unsupported" ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <FileWarning className="size-10 text-muted-foreground" />
              <p>
                이 형식은 브라우저 미리보기를 지원하지 않습니다.
                <br />
                다운로드 후 PC 프로그램에서 열어 주세요.
              </p>
              {item && downloadFileToDisk && item.hasContent ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void downloadFileToDisk(item.id, item.name)}
                >
                  다운로드
                </Button>
              ) : null}
            </div>
          ) : preview.html ? (
            <OfficePreviewContent html={preview.html} className="max-h-[70vh]" />
          ) : preview.blobUrl && previewKind === "image" ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.blobUrl}
                alt={item?.name ?? "미리보기"}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
          ) : preview.blobUrl && previewKind === "pdf" ? (
            <iframe
              title={item?.name ?? "PDF 미리보기"}
              src={preview.blobUrl}
              className="h-[70vh] w-full rounded border"
            />
          ) : preview.text ? (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded border bg-muted/30 p-4 text-sm">
              {preview.text}
            </pre>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
