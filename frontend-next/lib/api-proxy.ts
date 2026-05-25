/**
 * Next Route Handler → FastAPI 프록시 (브라우저 `/api/*` → `/api/v1/*`)
 * 우선순위: API_PROXY_URL(서버) → NEXT_PUBLIC_API_PROXY_URL → NEXT_PUBLIC_API_BASE_URL
 */

function readEnvBase(): string {
  return (
    process.env.API_PROXY_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_PROXY_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    ""
  )
}

/** Route Handler(서버)에서 Windows localhost → IPv6 연결 실패 방지 */
function normalizeProxyHost(base: string): string {
  return base.replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1")
}

const API_BASE = normalizeProxyHost(readEnvBase())

export function getApiProxyBase(): string | null {
  return API_BASE || null
}

/** /api/dashboard → /api/v1/dashboard (이미 v1이면 중복 추가하지 않음) */
export function mapNextApiPathToFastApi(pathSegments: string[]): string {
  const segments =
    pathSegments[0] === "v1" ? pathSegments.slice(1) : pathSegments
  const suffix = segments.join("/")
  return suffix ? `/api/v1/${suffix}` : "/api/v1"
}

export function buildProxyUrl(fastApiPath: string, search: string): string {
  if (!API_BASE) {
    throw new Error("API_PROXY_URL or NEXT_PUBLIC_API_BASE_URL is not configured")
  }
  const normalized = fastApiPath.startsWith("/") ? fastApiPath : `/${fastApiPath}`
  return `${API_BASE}${normalized}${search}`
}
