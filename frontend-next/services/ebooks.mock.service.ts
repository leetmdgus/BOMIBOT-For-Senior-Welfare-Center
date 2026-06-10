import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import type {
  Book,
  BookDetail,
  Category,
  EbooksListResponse,
} from "./ebooks.types"

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

export async function getEbook(
  id: string,
  regionId?: RegionId,
): Promise<BookDetail> {
  const store = await loadRegionStore({ regionId })
  const book = store.ebooks.booksData.find((item) => item.id === id)
  if (!book) {
    throw new Error("Ebook not found")
  }
  return book as BookDetail
}

export async function getCategoryStyles(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.ebooks.categoryStyles
}

export async function getSuggestedQuestions(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.ebooks.suggestedQuestions
}

export async function uploadEbookPdf(_params: {
  title: string
  team: string
  category: string
  file: File
}): Promise<BookDetail> {
  throw new Error(
    "목업 모드에서는 도서 등록을 지원하지 않습니다. 백엔드(API) 모드에서 등록해 주세요.",
  )
}
