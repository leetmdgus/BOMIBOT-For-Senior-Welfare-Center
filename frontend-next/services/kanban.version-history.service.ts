import * as apiService from "./kanban.version-history.api.service"
import * as mockService from "./kanban.version-history.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
const versionHistoryService = useMockApi ? mockService : apiService

export const getVersionHistory = versionHistoryService.getVersionHistory
export const restoreVersionHistory = versionHistoryService.restoreVersionHistory
