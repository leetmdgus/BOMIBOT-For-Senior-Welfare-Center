import {
  calendarEvents,
  progressData,
  statsData,
  volunteerEvents,
} from "@/lib/mocks/dashboard.mock"

import type { DashboardOverview } from "./dashboard.types"
import { toDashboardOverviewDTO, hydrateDashboardOverview } from "./dashboard.utils"

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return hydrateDashboardOverview(
    toDashboardOverviewDTO({
      stats: statsData,
      progress: progressData,
      calendarEvents,
      volunteerEvents,
    }),
  )
}
