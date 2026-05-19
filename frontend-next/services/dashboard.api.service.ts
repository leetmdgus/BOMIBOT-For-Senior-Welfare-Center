import type { DashboardOverview } from "./dashboard.types"
import { hydrateDashboardOverview } from "./dashboard.utils"
import type { DashboardOverviewDTO } from "./dashboard.types"

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const response = await fetch("/api/dashboard")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  const dto = (await response.json()) as DashboardOverviewDTO

  return hydrateDashboardOverview(dto)
}
