import type { DashboardOverview, DashboardOverviewDTO } from "./dashboard.types"
import { cachedApiGet } from "@/lib/api-get-cache"
import { apiClient, resolveApiPath } from "@/lib/api-client"
import { hydrateDashboardOverview } from "./dashboard.utils"

const dashboardPath = resolveApiPath("/api/dashboard", "/api/v1/dashboard")

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return cachedApiGet(
    dashboardPath,
    async () => {
      const dto = await apiClient.get<DashboardOverviewDTO>(dashboardPath)
      return hydrateDashboardOverview(dto)
    },
    { key: "dashboard:overview", ttlMs: 60_000 },
  )
}
