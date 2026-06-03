export type BusinessDocumentKind = "plan" | "evaluation" | "file"

export type BusinessDocumentSearchResult = {
  id: string
  source: string
  title: string
  snippet: string
  score?: number
  taskId?: string
  docKind?: BusinessDocumentKind
  fileId?: string
  href?: string
  year?: string
  majorCategory?: string
  categoryTitle?: string
  extension?: string
}

export type BusinessDocumentSearchFacets = {
  years: string[]
  categories: string[]
  extensions: string[]
}

export type BusinessDocumentSearchResponse = {
  query: string
  totalCorpus: number
  results: BusinessDocumentSearchResult[]
  facets?: BusinessDocumentSearchFacets
  filters?: {
    year?: string
    category?: string
    extension?: string
  }
}

export type BusinessDocumentSearchRequest = {
  query: string
  taskId?: string
  limit?: number
  year?: string
  category?: string
  extension?: string
}

export const DOCUMENT_SEARCH_FILTER_ALL = "__all__"
