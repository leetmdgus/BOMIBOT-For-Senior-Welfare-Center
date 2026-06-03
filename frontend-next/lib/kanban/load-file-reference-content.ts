import { getClientSession } from "@/lib/auth/session"
import { shouldUseMockApi } from "@/lib/api-service-mode"
import { resolveApiPath } from "@/lib/api-client"
import {
  isOfficePreviewableFile,
  loadOfficePreviewHtml,
} from "@/lib/files/office-preview"

function plainTextToHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return "<p></p>"
  if (trimmed.startsWith("<")) return trimmed
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("")
}

export type LoadedReferenceContent =
  | { kind: "html"; html: string }
  | { kind: "image"; objectUrl: string }
  | { kind: "iframe"; objectUrl: string }
  | { kind: "unsupported"; message: string }

function buildFileContentUrl(fileId: string): string {
  const path = resolveApiPath(
    `/api/files/${encodeURIComponent(fileId)}/content`,
    `/api/v1/files/${encodeURIComponent(fileId)}/content`,
  )
  if (path.startsWith("http")) return path
  if (typeof window !== "undefined") return path
  return path
}

function authHeaders(): HeadersInit {
  const session = getClientSession()
  const headers: Record<string, string> = {}
  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  if (session?.regionId) headers["X-Region-Id"] = session.regionId
  return headers
}

export async function loadFileManagerReferenceContent(
  fileId: string,
  options?: {
    mimeType?: string
    fileType?: string
    name?: string
    hasContent?: boolean
    contentMissing?: boolean
  },
): Promise<LoadedReferenceContent> {
  const url = buildFileContentUrl(fileId)
  const mime = (options?.mimeType ?? "").toLowerCase()
  const fileType = options?.fileType ?? ""
  const name = (options?.name ?? "").toLowerCase()

  const isImage =
    fileType === "image" ||
    mime.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(name)

  const isPdf =
    fileType === "pdf" || mime === "application/pdf" || name.endsWith(".pdf")

  const isOffice = isOfficePreviewableFile(
    options?.name ?? "",
    fileType,
    options?.mimeType,
  )

  if (isOffice) {
    if (options?.contentMissing) {
      return {
        kind: "unsupported",
        message:
          "파일 본문을 찾을 수 없습니다. 서버 저장소가 초기화되었을 수 있습니다. 파일 관리에서 다시 업로드해 주세요.",
      }
    }
    if (options?.hasContent === false && !shouldUseMockApi()) {
      return {
        kind: "unsupported",
        message: "업로드된 파일만 미리보기할 수 있습니다.",
      }
    }

    try {
      const html = await loadOfficePreviewHtml(fileId, {
        name: options?.name ?? "파일",
        hasContent: options?.hasContent,
        contentMissing: options?.contentMissing,
        mimeType: options?.mimeType,
      })
      return { kind: "html", html }
    } catch (err) {
      return {
        kind: "unsupported",
        message:
          err instanceof Error
            ? err.message
            : "Office 문서 미리보기를 불러오지 못했습니다.",
      }
    }
  }

  const response = await fetch(url, {
    credentials: "include",
    headers: authHeaders(),
  })

  if (!response.ok) {
    return {
      kind: "unsupported",
      message: "파일을 불러오지 못했습니다. 파일 관리에서 업로드 여부를 확인해 주세요.",
    }
  }

  if (isImage) {
    const blob = await response.blob()
    return { kind: "image", objectUrl: URL.createObjectURL(blob) }
  }

  if (isPdf) {
    const blob = await response.blob()
    return { kind: "iframe", objectUrl: URL.createObjectURL(blob) }
  }

  const textLike =
    mime.startsWith("text/") ||
    mime.includes("html") ||
    mime.includes("json") ||
    /\.(txt|md|html?|htm|csv)$/i.test(name)

  if (textLike) {
    const text = await response.text()
    const html = text.trim().startsWith("<")
      ? text
      : plainTextToHtml(text)
    return { kind: "html", html }
  }

  return {
    kind: "unsupported",
    message:
      "이 형식은 미리보기를 지원하지 않습니다. 파일 관리에서 다운로드해 확인해 주세요.",
  }
}

export function revokeLoadedReferenceContent(
  content: LoadedReferenceContent | null,
): void {
  if (!content) return
  if (content.kind === "image" || content.kind === "iframe") {
    URL.revokeObjectURL(content.objectUrl)
  }
}
