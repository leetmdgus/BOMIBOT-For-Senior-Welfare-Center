import type { CategoryStyles, EbooksListResponse } from "./ebooks.types"
import { apiClient, resolveApiPath } from "@/lib/api-client"

export async function getEbooks(params?: {
  category?: string
  search?: string
}): Promise<EbooksListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.category) searchParams.set("category", params.category)
  if (params?.search) searchParams.set("search", params.search)
  const query = searchParams.toString()
  return apiClient.get<EbooksListResponse>(
    resolveApiPath(
      `/api/ebooks${query ? `?${query}` : ""}`,
      `/api/v1/ebooks${query ? `?${query}` : ""}`,
    ),
  )
}

export async function getCategories() {
  const response = await getEbooks()
  return response.categories
}

export async function getCategoryStyles(): Promise<CategoryStyles> {
  return apiClient.get<CategoryStyles>(
    resolveApiPath(
      "/api/ebooks/category-styles",
      "/api/v1/ebooks/category-styles",
    ),
  )
}

export async function getSuggestedQuestions() {
  return apiClient.get<unknown[]>(
    resolveApiPath(
      "/api/ebooks/suggested-questions",
      "/api/v1/ebooks/suggested-questions",
    ),
  )
}

export async function createEbook(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return apiClient.post<Record<string, unknown>>(
    resolveApiPath("/api/ebooks", "/api/v1/ebooks"),
    body,
  )
}

export async function updateEbook(
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return apiClient.patch<Record<string, unknown>>(
    resolveApiPath(`/api/ebooks/${id}`, `/api/v1/ebooks/${id}`),
    body,
  )
}

export async function deleteEbook(id: string): Promise<{
  success: boolean
  deletedId: string
}> {
  return apiClient.delete(
    resolveApiPath(`/api/ebooks/${id}`, `/api/v1/ebooks/${id}`),
  )
}
