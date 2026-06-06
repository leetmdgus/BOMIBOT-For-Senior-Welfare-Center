import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./automation.api.service"
import * as mockService from "./automation.mock.service"

const automationService = shouldUseMockApi() ? mockService : apiService

export const analyzeEvidenceDocument = automationService.analyzeEvidenceDocument
export const parseHwpxDocument = automationService.parseHwpxDocument
export const downloadHwpxDocument = automationService.downloadHwpxDocument
export const renderHwpxSvg = automationService.renderHwpxSvg

export type {
  HwpxSvgRenderResult,
  HwpxSvgFontMode,
} from "./automation.api.service"
