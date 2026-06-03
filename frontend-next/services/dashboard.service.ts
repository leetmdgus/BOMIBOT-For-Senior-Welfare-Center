import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./dashboard.api.service"
import * as mockService from "./dashboard.mock.service"

const dashboardService = shouldUseMockApi() ? mockService : apiService

export const getDashboardOverview = dashboardService.getDashboardOverview

export function invalidateDashboardCache(): void {
  if (!shouldUseMockApi()) {
    apiService.invalidateDashboardCache()
  }
}
