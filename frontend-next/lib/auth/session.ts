import { parseSessionCookie } from "@/lib/auth/server-session"
import type { AuthSession } from "@/services/auth.types"

export const SESSION_STORAGE_KEY = "bomi_auth_session"
export const SESSION_COOKIE_NAME = "bomi_session"

function readSessionFromCookie(): AuthSession | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
  if (!match) return null
  const value = match.slice(SESSION_COOKIE_NAME.length + 1)
  return parseSessionCookie(value)
}

function serializeSessionForCookie(session: AuthSession): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session))}; Path=/; SameSite=Lax; Max-Age=604800`
}

export function getClientSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AuthSession
      if (parsed?.token && parsed?.regionId) return parsed
    }
  } catch {
    // fall through to cookie
  }

  const fromCookie = readSessionFromCookie()
  if (fromCookie) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fromCookie))
    return fromCookie
  }

  return null
}

export function setClientSession(session: AuthSession): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  document.cookie = serializeSessionForCookie(session)
}

/** 조직현황 등에서 프로필 변경 시 사이드바·헤더 즉시 반영 */
export function patchClientSession(patch: Partial<AuthSession>): void {
  const current = getClientSession()
  if (!current) return
  setClientSession({ ...current, ...patch })
}

/** localStorage만 있고 쿠키가 없으면 Next `/api/*` 프록시가 401 — 로그인 직후·구세션 복구 */
export function ensureSessionCookie(): void {
  const session = getClientSession()
  if (session) setClientSession(session)
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`
}
