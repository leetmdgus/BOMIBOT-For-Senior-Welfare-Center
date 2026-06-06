import type { FileItem } from "@/components/files/file-types"
import { triggerBlobDownload } from "@/lib/files/download-blob"
import { shouldUseMockApi } from "@/lib/api-service-mode"
import {
  isOfficePreviewableFile,
  loadOfficePreviewHtml,
  wrapOfficePreviewDocument,
} from "@/lib/files/office-preview"
import { downloadFileBlob } from "@/services/files.service"

export function isFileItemPreviewable(
  item: Pick<FileItem, "type" | "mimeType" | "name">,
): boolean {
  const mime = (item.mimeType ?? "").toLowerCase()
  const name = item.name.toLowerCase()

  if (mime.startsWith("image/")) return true
  if (mime.startsWith("text/")) return true
  if (mime === "application/pdf") return true
  if (/\.(png|jpe?g|gif|webp|svg|bmp|pdf|txt|md|csv|html?|htm)$/i.test(name)) {
    return true
  }
  if (isOfficePreviewableFile(name, item.type, item.mimeType)) return true

  return item.type === "image" || item.type === "pdf"
}

export function shouldPreviewInDialog(
  item: Pick<FileItem, "type">,
): boolean {
  return item.type !== "folder"
}

export type FilePreviewKind =
  | "seed"
  | "missing"
  | "hwp"
  | "office"
  | "image"
  | "pdf"
  | "text"
  | "unsupported"

export function getFilePreviewKind(
  item: Pick<
    FileItem,
    "type" | "mimeType" | "name" | "hasContent" | "contentMissing"
  >,
): FilePreviewKind {
  if (item.contentMissing) return "missing"

  // HWP/HWPX는 rhwp 정확 렌더(SVG) 우선 (.hwpx는 실패 시 office HTML로 폴백)
  if (/\.(hwp|hwpx)$/i.test(item.name)) {
    if (item.hasContent === false && !shouldUseMockApi()) return "seed"
    return "hwp"
  }

  if (isOfficePreviewableFile(item.name, item.type, item.mimeType)) {
    if (item.hasContent === false && !shouldUseMockApi()) return "seed"
    return "office"
  }

  if (!item.hasContent) return "seed"

  const mime = (item.mimeType ?? "").toLowerCase()
  const name = item.name.toLowerCase()

  if (mime.startsWith("image/") || item.type === "image") return "image"
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return "image"
  if (mime === "application/pdf" || item.type === "pdf" || /\.pdf$/i.test(name)) {
    return "pdf"
  }
  if (
    mime.startsWith("text/") ||
    /\.(txt|md|csv|html?|htm|json|xml|log)$/i.test(name)
  ) {
    return "text"
  }

  return "unsupported"
}

/** 업로드된 실제 파일 열기 — 미리보기 가능하면 새 탭, 아니면 다운로드(OS 기본 앱) */
export async function openFileItem(item: FileItem): Promise<void> {
  if (item.type === "folder") return

  const officePreviewable = isOfficePreviewableFile(
    item.name,
    item.type,
    item.mimeType,
  )
  const canPreviewOffice =
    officePreviewable &&
    (item.hasContent === true ||
      (shouldUseMockApi() && item.hasContent !== false))

  if (!item.hasContent && !canPreviewOffice) {
    window.alert(
      "이 항목은 예시 데이터입니다. 「파일 업로드」로 올린 파일부터 열거나 다운로드할 수 있습니다.",
    )
    return
  }

  if (!downloadFileBlob && !canPreviewOffice) {
    window.alert("파일 열기 API를 사용할 수 없습니다.")
    return
  }

  try {
    if (canPreviewOffice) {
      const html = await loadOfficePreviewHtml(item.id, {
        name: item.name,
        hasContent: item.hasContent,
        contentMissing: item.contentMissing,
        mimeType: item.mimeType,
      })
      const doc = wrapOfficePreviewDocument(html, item.name)
      const blob = new Blob([doc], { type: "text/html;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (!opened) {
        triggerBlobDownload(blob, `${item.name}.html`)
      } else {
        window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
      }
      return
    }

    const blob = await downloadFileBlob!(item.id)

    if (isFileItemPreviewable(item)) {
      const url = URL.createObjectURL(blob)
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (!opened) {
        triggerBlobDownload(blob, item.name)
      } else {
        window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
      }
      return
    }

    triggerBlobDownload(blob, item.name)
  } catch (error) {
    console.error("파일 열기 실패:", error)
    window.alert(
      error instanceof Error ? error.message : "파일을 열거나 다운로드하지 못했습니다.",
    )
  }
}

/** 파일 관리 첨부(참고 문서) — id만으로 열기 */
export async function openUploadedFileById(
  fileId: string,
  options?: { name?: string; mimeType?: string; fileType?: string },
): Promise<void> {
  await openFileItem({
    id: fileId,
    name: options?.name ?? "파일",
    type: (options?.fileType as FileItem["type"]) ?? "document",
    parentId: null,
    createdAt: "",
    modifiedAt: "",
    permission: "private",
    mimeType: options?.mimeType,
    hasContent: true,
  })
}

export function shouldOpenFileOnPrimaryClick(
  item: FileItem,
  event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
): boolean {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return false
  return item.type !== "folder"
}
