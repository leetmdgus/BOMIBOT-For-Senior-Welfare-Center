import { getClientSession } from "@/lib/auth/session"

function apiHttpBase(): string {
  const wsOnly = process.env.NEXT_PUBLIC_WS_BASE_URL?.replace(/\/$/, "")
  if (wsOnly) {
    return wsOnly.replace(/^ws/i, "http")
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? ""
}

function httpToWs(httpBase: string): string {
  return httpBase.replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws",
  )
}

function wsBase(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_BASE_URL?.replace(/\/$/, "")
  if (explicit) return explicit

  const proxyHttp = process.env.NEXT_PUBLIC_API_PROXY_URL?.replace(/\/$/, "")
  if (proxyHttp) return httpToWs(proxyHttp)

  const httpBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? ""
  if (!httpBase) return ""
  return httpToWs(httpBase)
}

/** FastAPI WebSocket URL (`/api/v1/ws`) */
export function buildCollaborationWsUrl(room: string): string | null {
  const session = getClientSession()
  if (!session?.token) return null

  const base = wsBase()
  if (!base) return null

  const params = new URLSearchParams({
    token: session.token,
    room,
    userName: session.name,
  })
  return `${base}/api/v1/ws?${params.toString()}`
}

/** 실시간 협업 — `NEXT_PUBLIC_COLLABORATION_ENABLED=true` 일 때만 연결 시도 */
export function isCollaborationAvailable(): boolean {
  return (
    process.env.NEXT_PUBLIC_COLLABORATION_ENABLED === "true" &&
    Boolean(wsBase() && getClientSession()?.token)
  )
}
