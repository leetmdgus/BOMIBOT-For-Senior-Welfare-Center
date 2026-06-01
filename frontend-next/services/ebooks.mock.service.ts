import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import type { Book, Category, EbooksListResponse } from "./ebooks.types"

export async function getEbooks(
  params?: {
    category?: string
    search?: string
  },
  regionId?: RegionId,
): Promise<EbooksListResponse> {
  const store = await loadRegionStore({ regionId })

  const { booksData, categories, categoryStyles } = store.ebooks
  let filtered = booksData

  if (params?.category && params.category !== "??") {
    filtered = filtered.filter((book) => book.category === params.category)
  }

  if (params?.search) {
    const keyword = params.search.toLowerCase()
    filtered = filtered.filter(
      (book) =>
        book.title.toLowerCase().includes(keyword) ||
        book.team.toLowerCase().includes(keyword),
    )
  }

  return {
    ebooks: filtered,
    categories,
    categoryStyles,
    total: filtered.length,
  }
}

export async function getCategories(regionId?: RegionId): Promise<Category[]> {
  const store = await loadRegionStore({ regionId })
  return store.ebooks.categories
}

export async function getCategoryStyles(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.ebooks.categoryStyles
}

export async function getSuggestedQuestions(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.ebooks.suggestedQuestions
}
