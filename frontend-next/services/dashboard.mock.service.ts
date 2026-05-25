import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"

import type { DashboardOverview } from "./dashboard.types"
import { hydrateDashboardOverview } from "./dashboard.utils"

export async function getDashboardOverview(
  regionId?: RegionId,
): Promise<DashboardOverview> {
  const store = await loadRegionStore({ regionId })

  const { statsData, progressData, calendarEvents, volunteerEvents } =
    store.dashboard

  return hydrateDashboardOverview({
    stats: statsData,
    progress: progressData,
    calendarEvents,
    volunteerEvents,
  })
}
