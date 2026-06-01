import type { NextRequest } from "next/server"

import { getRegionInfo, isRegionId, type RegionId } from "@/lib/auth/regions"
import type { AuthSession } from "@/services/auth.types"

import { SESSION_COOKIE_NAME } from "@/lib/auth/session"

export { SESSION_COOKIE_NAME }

export function parseSessionCookie(value: string | undefined): AuthSession | null {
  if (!value) return null

  try {
    const session = JSON.parse(decodeURIComponent(value)) as AuthSession
    if (!session?.regionId || !isRegionId(session.regionId)) return null
    if (!session.token) return null
    return session
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: Request | NextRequest): AuthSession | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))

  if (!match) return null

  const value = match.slice(SESSION_COOKIE_NAME.length + 1)
  return parseSessionCookie(value)
}

export function getRegionIdFromRequest(
  request: Request | NextRequest,
): RegionId | null {
  return getSessionFromRequest(request)?.regionId ?? null
}

export function serializeSessionCookie(session: AuthSession): string {
  const region = getRegionInfo(session.regionId)
  const payload: AuthSession = {
    ...session,
    regionLabel: region.label,
    orgName: region.orgName,
  }
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; SameSite=Lax; Max-Age=604800`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`
}
