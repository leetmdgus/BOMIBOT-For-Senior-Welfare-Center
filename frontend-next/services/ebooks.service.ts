import { shouldUseMockApi } from "@/lib/api-service-mode"
import * as apiService from "./ebooks.api.service"
import * as mockService from "./ebooks.mock.service"

const ebooksService = shouldUseMockApi() ? mockService : apiService

export const getEbooks = ebooksService.getEbooks
export const getCategories = ebooksService.getCategories
export const getCategoryStyles = ebooksService.getCategoryStyles
export const getSuggestedQuestions = ebooksService.getSuggestedQuestions
export const createEbook =
  "createEbook" in ebooksService ? ebooksService.createEbook : undefined
export const updateEbook =
  "updateEbook" in ebooksService ? ebooksService.updateEbook : undefined
export const deleteEbook =
  "deleteEbook" in ebooksService ? ebooksService.deleteEbook : undefined

export type { EbooksListResponse } from "./ebooks.types"
