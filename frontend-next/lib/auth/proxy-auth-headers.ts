import type { NextRequest } from "next/server"

import { getSessionFromRequest } from "@/lib/auth/server-session"

/** ISO-8859-1 헤더 제한 — api-client와 동일 */
function encodeUserNameHeader(name: string): { header: string; value: string } {
  if (/^[\x00-\xff]*$/.test(name)) {
    return { header: "X-User-Name", value: name }
  }
  const bytes = new TextEncoder().encode(name)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return { header: "X-User-Name-B64", value: btoa(binary) }
}

/**
 * 브라우저 `<img>` 등은 Authorization을 보내지 않음.
 * Next `/api/*` 프록시가 bomi_session 쿠키에서 FastAPI 헤더를 채움.
 */
export function applyProxyAuthHeaders(
  request: NextRequest,
  headers: Headers,
): void {
  if (headers.has("authorization")) return

  const session = getSessionFromRequest(request)
  if (!session?.token) return

  headers.set("Authorization", `Bearer ${session.token}`)

  if (session.regionId && !headers.has("x-region-id")) {
    headers.set("X-Region-Id", session.regionId)
  }

  if (
    session.name &&
    !headers.has("x-user-name") &&
    !headers.has("x-user-name-b64")
  ) {
    const { header, value } = encodeUserNameHeader(session.name)
    headers.set(header, value)
  }
}
