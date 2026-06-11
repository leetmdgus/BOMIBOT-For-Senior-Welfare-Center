import { DashboardPage } from "@menu/dashboard/components/dashboard-page"
import { shouldUseMockApi } from "@/lib/api-service-mode"
import { fetchDashboardOverviewServer } from "@/lib/dashboard/fetch-dashboard-overview.server"
import { getCurrentYearString } from "@/lib/current-year"

export default async function Page() {
  const year = getCurrentYearString()
  let initialOverviewDTO = null

  if (!shouldUseMockApi()) {
    const dto = await fetchDashboardOverviewServer(year)
    if (dto) {
      initialOverviewDTO = dto
    }
  }

  return <DashboardPage initialOverviewDTO={initialOverviewDTO} />
}