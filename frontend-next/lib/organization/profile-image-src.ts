import { resolveApiPath } from "@/lib/api-client"

/** public/ 한글 파일명 등 경로 인코딩 */
function toPublicAssetUrl(path: string): string {
  if (!path.startsWith("/")) return path
  return path
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/")
}

/** POST 전용 업로드 URL — 이미지 GET 불가 */
function isProfileUploadEndpoint(path: string): boolean {
  return /\/employees\/[^/]+\/profile-image\/?$/i.test(path)
}

function encodeApiProfileContentPath(path: string): string {
  const match = path.match(
    /^(\/api(?:\/v1)?\/employees\/profile-content\/)(.+)$/i,
  )
  if (!match) return path
  const prefix = match[1].replace("/api/v1/", "/api/")
  const key = encodeURIComponent(match[2])
  return `${prefix}${key}`
}

/** 직원 프로필 URL — API 업로드 경로·public·blob 지원 */
export function resolveProfileImageSrc(
  path: string,
  options?: { cacheBust?: string | number },
): string {
  const trimmed = path.trim()
  if (!trimmed) return trimmed

  if (isProfileUploadEndpoint(trimmed)) {
    return ""
  }

  let resolved = trimmed
  if (trimmed.startsWith("/api/v1/") || trimmed.startsWith("/api/")) {
    const apiPath = trimmed.startsWith("/api/v1/")
      ? resolveApiPath(trimmed.replace("/api/v1", "/api"), trimmed)
      : trimmed
    resolved = encodeApiProfileContentPath(apiPath)
  }

  if (options?.cacheBust !== undefined && options.cacheBust !== "") {
    const separator = resolved.includes("?") ? "&" : "?"
    return `${resolved}${separator}v=${encodeURIComponent(String(options.cacheBust))}`
  }

  if (trimmed.startsWith("/api/")) {
    return resolved
  }
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed
  }
  return toPublicAssetUrl(trimmed)
}
