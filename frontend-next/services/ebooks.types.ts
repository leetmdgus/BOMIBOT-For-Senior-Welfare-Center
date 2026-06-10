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

/** 연간 보고서 항목의 문서 한 종류(사업계획서·만족도조사·사업평가) */
export interface AnnualReportSection {
  label: string
  completedAt?: string
  fileId?: string
  fileName?: string
  averageSatisfaction?: number
}

/** 연간 보고서 책자에 누적되는 사업(업무) 단위 항목 */
export interface AnnualReportEntry {
  taskId: string
  programName: string
  team?: string | null
  createdAt?: string
  updatedAt?: string
  plan?: AnnualReportSection | null
  survey?: AnnualReportSection | null
  evaluation?: AnnualReportSection | null
}

/** 책자 단건 — 연간 보고서일 경우 entries 누적 */
export interface BookDetail extends Book {
  isAnnualReport?: boolean
  year?: string
  entries?: AnnualReportEntry[]
  createdAt?: string
  updatedAt?: string
  /** 업로드한 PDF 도서 — true면 /ebooks/{id}/pdf가 원본 PDF를 그대로 서빙 */
  isUploadedPdf?: boolean
  sourceFilename?: string
}

/** 신규 도서 등록 가능한 카테고리(필터 전용 "전체" 제외) */
export const REGISTERABLE_CATEGORIES: Exclude<Category, "전체">[] = [
  "운영보고서",
  "리플릿",
  "소식지",
  "안내서",
  "기념집",
]