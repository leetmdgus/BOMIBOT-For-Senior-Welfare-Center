import * as apiService from "./ebooks.api.service"
import * as mockService from "./ebooks.mock.service"

const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const ebooksService = useMockApi ? mockService : apiService

export const getEbooks = ebooksService.getEbooks
export const getCategories = ebooksService.getCategories
export const getCategoryStyles = ebooksService.getCategoryStyles
export const getSuggestedQuestions = ebooksService.getSuggestedQuestions

export type { EbooksListResponse } from "./ebooks.types"
