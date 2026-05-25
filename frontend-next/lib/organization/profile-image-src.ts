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

/** 직원 프로필 URL — API 업로드 경로·public·blob 지원 */
export function resolveProfileImageSrc(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return trimmed

  if (isProfileUploadEndpoint(trimmed)) {
    return ""
  }

  if (trimmed.startsWith("/api/v1/")) {
    return resolveApiPath(trimmed.replace("/api/v1", "/api"), trimmed)
  }
  if (trimmed.startsWith("/api/")) {
    return trimmed
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
