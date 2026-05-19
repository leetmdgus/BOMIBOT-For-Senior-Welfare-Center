import type { CategoryStyles, EbooksListResponse } from "./ebooks.types"

export async function getEbooks(params?: {
  category?: string
  search?: string
}): Promise<EbooksListResponse> {
  const searchParams = new URLSearchParams()

  if (params?.category) searchParams.set("category", params.category)
  if (params?.search) searchParams.set("search", params.search)

  const query = searchParams.toString()
  const response = await fetch(`/api/ebooks${query ? `?${query}` : ""}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getCategories() {
  const response = await getEbooks()

  return response.categories
}

export async function getCategoryStyles(): Promise<CategoryStyles> {
  const response = await fetch("/api/ebooks/category-styles")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function getSuggestedQuestions() {
  const response = await fetch("/api/ebooks/suggested-questions")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}
