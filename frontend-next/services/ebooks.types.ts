export type Category =
  | "전체"
  | "운영보고서"
  | "리플릿"
  | "소식지"
  | "안내서"
  | "기념집"

export type ViewMode = "grid" | "list"

export interface Book {
  id: string
  title: string
  team: string
  category: Category
  thumbnail: string
}

export type CategoryStyles = Record<Category, string>

export interface EbooksListResponse {
  ebooks: Book[]
  categories: Category[]
  categoryStyles: CategoryStyles
  total: number
}