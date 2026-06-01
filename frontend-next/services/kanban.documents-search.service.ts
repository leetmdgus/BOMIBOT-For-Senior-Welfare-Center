import { shouldUseMockApi } from "@/lib/api-service-mode"

import * as apiService from "./kanban.documents-search.api.service"
import * as mockService from "./kanban.documents-search.mock.service"

export type {
  BusinessDocumentKind,
  BusinessDocumentSearchFacets,
  BusinessDocumentSearchRequest,
  BusinessDocumentSearchResponse,
  BusinessDocumentSearchResult,
} from "./kanban.documents-search.types"
export { DOCUMENT_SEARCH_FILTER_ALL } from "./kanban.documents-search.types"

const searchService = shouldUseMockApi() ? mockService : apiService

export const searchBusinessDocuments = searchService.searchBusinessDocuments
