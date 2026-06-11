"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, Film, ImageIcon, Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  detectDocumentMediaKind,
  parseDocumentMediaContent,
  serializeDocumentMediaContent,
} from "@/lib/kanban/document-media"
import { cn } from "@/lib/utils"
import { uploadFilesToServer } from "@/services/files.service"
import { useDocumentMediaPreview } from "@menu/kanban/components/task-detail/use-document-media-preview"

type DocumentMediaBlockProps = {
  title: string
  content?: string
  readOnly?: boolean
  taskId?: string
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onRemove?: () => void
  className?: string
}

const KIND_LABEL: Record<string, string> = {
  image: "이미지",
  pdf: "PDF",
  video: "동영상",
}

export function DocumentMediaBlock({
  title,
  content,
  readOnly,
  taskId,
  onTitleChange,
  onContentChange,
  onRemove,
  className,
}: DocumentMediaBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const attachment = parseDocumentMediaContent(content)
  const { url, loading, error, setLocalFile } = useDocumentMediaPreview(
    attachment?.fileId,
  )

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || readOnly) return
    const file = files[0]
    if (!file) return

    setUploading(true)
    try {
      let fileId = ""
      let name = file.name
      let mimeType = file.type

      if (uploadFilesToServer && taskId) {
        const uploaded = await uploadFilesToServer({
          files: [file],
          taskId,
        })
        const item = uploaded[0]
        if (!item) throw new Error("업로드에 실패했습니다.")
        fileId = item.id
        name = item.name
        mimeType = item.mimeType ?? file.type
      } else {
        fileId = `local-${Date.now()}`
        setLocalFile(file)
      }

      onContentChange(
        serializeDocumentMediaContent({
          fileId,
          name,
          mimeType,
          mediaKind: detectDocumentMediaKind(name, mimeType),
        }),
      )
      if (!title.trim()) {
        onTitleChange(name.replace(/\.[^.]+$/, ""))
      }
    } catch (error) {
      console.error("자료 업로드 실패:", error)
      alert(
        error instanceof Error
          ? error.message
          : "PDF·이미지·동영상 업로드에 실패했습니다.",
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div
      className={cn(
        "document-media-block border border-black bg-white",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-black/20 bg-[#f5f5f5] px-3 py-2">
        <MediaKindIcon kind={attachment?.mediaKind} />
        <span className="text-xs font-semibold text-neutral-700">
          {attachment ? KIND_LABEL[attachment.mediaKind] ?? "자료" : "자료 첨부"}
        </span>
        {!readOnly && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        {readOnly ? (
          <p className="text-sm font-medium">{title || attachment?.name || "첨부 자료"}</p>
        ) : (
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="자료 제목 (예: 사업 추진 사진, 활동 영상)"
            className="hwpx-inline-input max-w-lg font-medium"
          />
        )}

        {!attachment && !readOnly ? (
          <div
            className="print-hide flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-black/30 bg-[#fafafa] px-4 py-8"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void handleFiles(e.dataTransfer.files)
            }}
          >
            <p className="text-center text-sm text-muted-foreground">
              PDF · 이미지 · 동영상을 끌어 놓거나 아래 버튼으로 추가하세요.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              파일 선택
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*,application/pdf,.pdf,.mp4,.webm,.mov"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>
        ) : null}

        {attachment ? (
          <DocumentMediaPreview
            attachment={attachment}
            previewUrl={url}
            loading={loading}
            error={error}
          />
        ) : readOnly ? (
          <p className="text-sm text-muted-foreground">첨부된 파일이 없습니다.</p>
        ) : null}
      </div>
    </div>
  )
}

function MediaKindIcon({ kind }: { kind?: string }) {
  if (kind === "video") return <Film className="size-4 shrink-0 text-neutral-600" />
  if (kind === "pdf") return <FileText className="size-4 shrink-0 text-neutral-600" />
  return <ImageIcon className="size-4 shrink-0 text-neutral-600" />
}

function DocumentMediaPreview({
  attachment,
  previewUrl,
  loading,
  error,
}: {
  attachment: NonNullable<ReturnType<typeof parseDocumentMediaContent>>
  previewUrl: string | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        미리보기를 불러오는 중…
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {error}
      </p>
    )
  }

  if (!previewUrl) {
    return (
      <p className="text-sm text-muted-foreground">
        {attachment.name} — 미리보기를 준비 중입니다.
      </p>
    )
  }

  if (attachment.mediaKind === "image") {
    return (
      <figure className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={attachment.name}
          className="mx-auto max-h-[480px] max-w-full rounded border border-black/15 object-contain"
        />
        <figcaption className="text-center text-xs text-muted-foreground">
          {attachment.name}
        </figcaption>
      </figure>
    )
  }

  if (attachment.mediaKind === "video") {
    return (
      <figure className="space-y-2">
        <video
          src={previewUrl}
          controls
          className="mx-auto max-h-[480px] w-full max-w-full rounded border border-black/15 bg-black"
        >
          <track kind="captions" />
        </video>
        <figcaption className="text-center text-xs text-muted-foreground">
          {attachment.name}
        </figcaption>
      </figure>
    )
  }

  return (
    <figure className="space-y-2">
      <iframe
        title={attachment.name}
        src={previewUrl}
        className="h-[min(480px,70vh)] w-full rounded border border-black/15 bg-white"
      />
      <figcaption className="text-center text-xs text-muted-foreground">
        {attachment.name}
      </figcaption>
    </figure>
  )
}
