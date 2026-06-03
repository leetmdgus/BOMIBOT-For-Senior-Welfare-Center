import type {
  BusinessDocumentSearchFacets,
  BusinessDocumentSearchRequest,
  BusinessDocumentSearchResponse,
  BusinessDocumentSearchResult,
} from "./kanban.documents-search.types"

const samples: BusinessDocumentSearchResult[] = [
  {
    id: "plan:mock-1",
    source: "documents",
    title: "사업계획 · 청소년 진로 멘토링",
    snippet: "목적: 지역 청소년의 진로 탐색 지원…",
    taskId: "mock-1",
    docKind: "plan",
    href: "/kanban/task/mock-1/business-plan",
    year: "2026",
    majorCategory: "청소년 지원",
    categoryTitle: "사업계획",
  },
  {
    id: "eval:mock-2",
    source: "documents",
    title: "사업평가 · 문화예술 체험",
    snippet: "성과지표: 참여자 만족도 90% 이상…",
    taskId: "mock-2",
    docKind: "evaluation",
    href: "/kanban/task/mock-2/evaluation",
    year: "2025",
    majorCategory: "문화예술",
    categoryTitle: "사업평가",
  },
  {
    id: "file:mock-3",
    source: "documents",
    title: "첨부 · 사업계획안.pdf (청소년 진로 멘토링)",
    snippet: "첨부파일 · 사업계획안.pdf 업무: 청소년 진로 멘토링…",
    taskId: "mock-1",
    docKind: "file",
    fileId: "file-mock-3",
    href: "/kanban/task/mock-1/evaluation",
    year: "2026",
    majorCategory: "청소년 지원",
    categoryTitle: "사업계획",
    extension: "pdf",
  },
  {
    id: "file:mock-4",
    source: "documents",
    title: "첨부 · 실적집계.xlsx (문화예술 체험)",
    snippet: "첨부파일 · 실적집계.xlsx 업무: 문화예술 체험…",
    taskId: "mock-2",
    docKind: "file",
    fileId: "file-mock-4",
    href: "/kanban/task/mock-2/evaluation",
    year: "2025",
    majorCategory: "문화예술",
    categoryTitle: "사업평가",
    extension: "xlsx",
  },
]

function collectFacets(items: BusinessDocumentSearchResult[]): BusinessDocumentSearchFacets {
  const years = new Set<string>()
  const categories = new Set<string>()
  const extensions = new Set<string>()
  for (const item of items) {
    if (item.year) years.add(item.year)
    if (item.majorCategory) categories.add(item.majorCategory)
    if (item.extension) extensions.add(item.extension)
  }
  return {
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    categories: [...categories].sort(),
    extensions: [...extensions].sort(),
  }
}

function matchesFilters(
  item: BusinessDocumentSearchResult,
  body: BusinessDocumentSearchRequest,
): boolean {
  if (body.year && item.year !== body.year) return false
  if (body.category) {
    const needle = body.category.toLowerCase()
    const haystack = [item.majorCategory, item.categoryTitle, item.title]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (body.extension) {
    if (item.docKind === "plan" || item.docKind === "evaluation") return false
    if ((item.extension || "").toLowerCase() !== body.extension.toLowerCase()) {
      return false
    }
  }
  return true
}

export async function searchBusinessDocuments(
  body: BusinessDocumentSearchRequest,
): Promise<BusinessDocumentSearchResponse> {
  const query = (body.query || "").trim().toLowerCase()
  const scoped = body.taskId
    ? samples.filter((item) => item.taskId === body.taskId)
    : samples
  const filtered = scoped.filter((item) => matchesFilters(item, body))
  const results = query
    ? filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.snippet.toLowerCase().includes(query) ||
          (item.majorCategory || "").toLowerCase().includes(query) ||
          (item.extension || "").toLowerCase().includes(query) ||
          (item.year || "").includes(query),
      )
    : filtered

  return {
    query: body.query || "",
    totalCorpus: filtered.length,
    results: results.slice(0, body.limit ?? 12),
    facets: collectFacets(scoped),
    filters: {
      year: body.year || "",
      category: body.category || "",
      extension: body.extension || "",
    },
  }
}
