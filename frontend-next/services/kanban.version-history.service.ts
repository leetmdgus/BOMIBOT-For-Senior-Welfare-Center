import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./kanban.version-history.api.service"
import * as mockService from "./kanban.version-history.mock.service"

const versionHistoryService = shouldUseMockApi() ? mockService : apiService

export const getVersionHistory = versionHistoryService.getVersionHistory
export const restoreVersionHistory = versionHistoryService.restoreVersionHistory
