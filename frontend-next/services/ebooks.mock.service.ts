import {
  booksData,
  categories,
  categoryStyles,
  suggestedQuestions,
} from "@/lib/mocks/ebooks.mock"
import type { Book, Category, EbooksListResponse } from "./ebooks.types"

export async function getEbooks(params?: {
  category?: string
  search?: string
}): Promise<EbooksListResponse> {
  let filtered = booksData

  if (params?.category && params.category !== "전체") {
    filtered = filtered.filter((book) => book.category === params.category)
  }

  if (params?.search) {
    const keyword = params.search.toLowerCase()
    filtered = filtered.filter(
      (book) =>
        book.title.toLowerCase().includes(keyword) ||
        book.team.toLowerCase().includes(keyword)
    )
  }

  return {
    ebooks: filtered,
    categories,
    categoryStyles,
    total: filtered.length,
  }
}

export async function getCategories(): Promise<Category[]> {
  return categories
}

export async function getCategoryStyles() {
  return categoryStyles
}

export async function getSuggestedQuestions() {
  return suggestedQuestions
}
