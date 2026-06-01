import { cookies } from "next/headers"

import { buildProxyUrl } from "@/lib/api-proxy"
import { shouldUseMockApi } from "@/lib/api-service-mode"
import { getCurrentYearString } from "@/lib/current-year"
import { parseSessionCookie } from "@/lib/auth/server-session"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session"
import type { DashboardOverviewDTO } from "@/services/dashboard.types"

/** RSC/Route Handler — FastAPI 대시보드 (세션 쿠키 필요) */
export async function fetchDashboardOverviewServer(
  year: string = getCurrentYearString(),
): Promise<DashboardOverviewDTO | null> {
  if (shouldUseMockApi()) return null

  const cookieStore = await cookies()
  const session = parseSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  if (!session?.token || !session.regionId) return null

  const target = buildProxyUrl(
    `/api/v1/dashboard?year=${encodeURIComponent(year)}`,
    "",
  )

  try {
    const response = await fetch(target, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "X-Region-Id": session.regionId,
      },
      cache: "no-store",
    })
    if (!response.ok) return null
    return (await response.json()) as DashboardOverviewDTO
  } catch {
    return null
  }
}
