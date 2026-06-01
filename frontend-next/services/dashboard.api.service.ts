import type { DashboardOverview, DashboardOverviewDTO } from "./dashboard.types"
import { cachedApiGet, invalidateApiGetCache } from "@/lib/api-get-cache"
import { apiClient, resolveApiPath } from "@/lib/api-client"
import { getCurrentYearString } from "@/lib/current-year"
import { hydrateDashboardOverview } from "./dashboard.utils"

const dashboardPath = resolveApiPath("/api/dashboard", "/api/v1/dashboard")

export async function getDashboardOverview(
  year: string = getCurrentYearString(),
): Promise<DashboardOverview> {
  const path = `${dashboardPath}?year=${encodeURIComponent(year)}`
  return cachedApiGet(
    path,
    async () => {
      const dto = await apiClient.get<DashboardOverviewDTO>(path)
      return hydrateDashboardOverview(dto)
    },
    { key: `dashboard:overview:${year}`, ttlMs: 60_000 },
  )
}

export function invalidateDashboardCache(): void {
  invalidateApiGetCache("dashboard")
}
