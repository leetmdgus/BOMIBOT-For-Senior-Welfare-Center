import * as apiService from "./kanban.performance.api.service"
import * as mockService from "./kanban.performance.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const performanceService = useMockApi ? mockService : apiService

export const getPerformanceRows = performanceService.getPerformanceRows
export const getInputManagementRows = performanceService.getInputManagementRows
export const getMonthlyPlan = performanceService.getMonthlyPlan
