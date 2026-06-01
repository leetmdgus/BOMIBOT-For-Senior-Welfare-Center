import { apiClient, resolveApiPath } from "@/lib/api-client"

import type {
  BusinessDocumentSearchRequest,
  BusinessDocumentSearchResponse,
} from "./kanban.documents-search.types"

function documentsSearchPath(): string {
  return resolveApiPath(
    "/api/kanban/documents/search",
    "/api/v1/kanban/documents/search",
  )
}

export async function searchBusinessDocuments(
  body: BusinessDocumentSearchRequest,
): Promise<BusinessDocumentSearchResponse> {
  return apiClient.post<BusinessDocumentSearchResponse>(
    documentsSearchPath(),
    body,
  )
}
