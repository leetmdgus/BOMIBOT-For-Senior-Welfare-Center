import * as apiService from "./dashboard.api.service"
import * as mockService from "./dashboard.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const dashboardService = useMockApi ? mockService : apiService

export const getDashboardOverview = dashboardService.getDashboardOverview
