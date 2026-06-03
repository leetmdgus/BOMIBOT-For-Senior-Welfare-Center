import { resolveApiPath } from "@/lib/api-client"
import { getClientSession } from "@/lib/auth/session"
import type { DocumentMediaAttachment } from "@/services/kanban.task-detail.types"

export function detectDocumentMediaKind(
  name: string,
  mimeType?: string,
): DocumentMediaAttachment["mediaKind"] {
  const lower = name.toLowerCase()
  const mime = (mimeType ?? "").toLowerCase()
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lower)) {
    return "image"
  }
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(lower)) {
    return "video"
  }
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    return "pdf"
  }
  if (/\.(png|jpe?g|gif|webp)$/i.test(lower)) return "image"
  if (/\.(mp4|webm|mov)$/i.test(lower)) return "video"
  return "pdf"
}

export function parseDocumentMediaContent(
  content?: string,
): DocumentMediaAttachment | null {
  if (!content?.trim()) return null
  try {
    const parsed = JSON.parse(content) as Partial<DocumentMediaAttachment>
    if (!parsed.fileId || !parsed.name) return null
    return {
      fileId: String(parsed.fileId),
      name: String(parsed.name),
      mimeType: parsed.mimeType ? String(parsed.mimeType) : undefined,
      mediaKind:
        parsed.mediaKind ??
        detectDocumentMediaKind(String(parsed.name), parsed.mimeType),
    }
  } catch {
    return null
  }
}

export function serializeDocumentMediaContent(
  attachment: DocumentMediaAttachment,
): string {
  return JSON.stringify(attachment)
}

export function fileContentApiPath(fileId: string): string {
  return resolveApiPath(
    `/api/files/${encodeURIComponent(fileId)}/content`,
    `/api/v1/files/${encodeURIComponent(fileId)}/content`,
  )
}

export function authHeadersForFileFetch(): HeadersInit {
  const session = getClientSession()
  const headers: Record<string, string> = {}
  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  if (session?.regionId) headers["X-Region-Id"] = session.regionId
  return headers
}

export async function fetchFileBlobUrl(fileId: string): Promise<string> {
  const response = await fetch(fileContentApiPath(fileId), {
    credentials: "include",
    headers: authHeadersForFileFetch(),
  })
  if (!response.ok) {
    throw new Error("파일을 불러오지 못했습니다.")
  }
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export const DOCUMENT_MEDIA_ACCEPT =
  "image/*,video/*,application/pdf,.pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
