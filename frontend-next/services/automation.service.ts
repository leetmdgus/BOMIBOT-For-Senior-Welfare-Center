import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./automation.api.service"
import * as mockService from "./automation.mock.service"

const automationService = shouldUseMockApi() ? mockService : apiService

export const parseHwpxDocument = automationService.parseHwpxDocument
export const downloadHwpxDocument = automationService.downloadHwpxDocument
