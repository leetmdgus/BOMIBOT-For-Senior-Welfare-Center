"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Eye, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DocumentSearchResultViewer } from "@menu/kanban/components/documents/document-search-result-viewer"
import { cn } from "@/lib/utils"
import {
  DOCUMENT_SEARCH_FILTER_ALL,
  searchBusinessDocuments,
  type BusinessDocumentSearchFacets,
  type BusinessDocumentSearchResult,
} from "@/services/kanban.documents-search.service"

const DOC_KIND_LABELS: Record<string, string> = {
  plan: "사업계획",
  evaluation: "사업평가",
  file: "첨부",
}

type DocumentRagSearchPanelProps = {
  taskId?: string
  className?: string
  compact?: boolean
}

export function DocumentRagSearchPanel({
  taskId,
  className,
  compact = false,
}: DocumentRagSearchPanelProps) {
  const [query, setQuery] = useState("")
  const [year, setYear] = useState(DOCUMENT_SEARCH_FILTER_ALL)
  const [category, setCategory] = useState(DOCUMENT_SEARCH_FILTER_ALL)
  const [extension, setExtension] = useState(DOCUMENT_SEARCH_FILTER_ALL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<BusinessDocumentSearchResult[]>([])
  const [totalCorpus, setTotalCorpus] = useState<number | null>(null)
  const [searchedQuery, setSearchedQuery] = useState("")
  const [facets, setFacets] = useState<BusinessDocumentSearchFacets>({
    years: [],
    categories: [],
    extensions: [],
  })
  const [viewTarget, setViewTarget] =
    useState<BusinessDocumentSearchResult | null>(null)

  const resolveFilter = (value: string) =>
    value === DOCUMENT_SEARCH_FILTER_ALL ? undefined : value

  const runSearch = useCallback(async () => {
    const text = query.trim()
    setLoading(true)
    setError(null)
    try {
      const response = await searchBusinessDocuments({
        query: text,
        taskId,
        limit: 12,
        year: resolveFilter(year),
        category: resolveFilter(category),
        extension: resolveFilter(extension),
      })
      setResults(response.results)
      setTotalCorpus(response.totalCorpus)
      setSearchedQuery(text)
      if (response.facets) {
        setFacets(response.facets)
      }
    } catch (err) {
      console.error("[documents-search]", err)
      setError("사업문서 검색에 실패했습니다.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, taskId, year, category, extension])

  useEffect(() => {
    void runSearch()
    // 필터·업무 범위 변경 시에만 자동 조회 (키워드는 검색 버튼)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, year, category, extension])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void runSearch()
  }

  const resetFilters = () => {
    setYear(DOCUMENT_SEARCH_FILTER_ALL)
    setCategory(DOCUMENT_SEARCH_FILTER_ALL)
    setExtension(DOCUMENT_SEARCH_FILTER_ALL)
    setQuery("")
  }

  const hasActiveFilters =
    year !== DOCUMENT_SEARCH_FILTER_ALL ||
    category !== DOCUMENT_SEARCH_FILTER_ALL ||
    extension !== DOCUMENT_SEARCH_FILTER_ALL

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-muted/20",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="mb-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          사업문서 검색
        </p>
        <p className="text-xs text-muted-foreground">
          {taskId
            ? "이 업무의 계획·평가·첨부에서 연관 내용을 찾습니다."
            : "키워드와 카테고리(사업)·연도·확장자로 사업계획·평가·첨부를 검색합니다."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-[11px] text-muted-foreground">
              카테고리(사업)
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DOCUMENT_SEARCH_FILTER_ALL}>전체</SelectItem>
                {facets.categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[110px] space-y-1">
            <label className="text-[11px] text-muted-foreground">연도</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DOCUMENT_SEARCH_FILTER_ALL}>전체</SelectItem>
                {facets.years.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[110px] space-y-1">
            <label className="text-[11px] text-muted-foreground">확장자</label>
            <Select value={extension} onValueChange={setExtension}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DOCUMENT_SEARCH_FILTER_ALL}>전체</SelectItem>
                {facets.extensions.map((item) => (
                  <SelectItem key={item} value={item}>
                    .{item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 예산, 목표, 만족도 조사…"
              className="h-9 bg-white pl-9"
            />
          </div>
          <Button type="submit" className="h-9" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                검색 중
              </>
            ) : (
              "검색"
            )}
          </Button>
          {hasActiveFilters || query ? (
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={resetFilters}
            >
              초기화
            </Button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      ) : null}

      {/* 결과 요약 문구는 숨김 */}

      {results.length > 0 ? (
        <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {results.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-medium text-foreground hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">
                    {item.title}
                  </span>
                )}
                {item.docKind ? (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {DOC_KIND_LABELS[item.docKind] ?? item.docKind}
                  </span>
                ) : null}
                {item.majorCategory ? (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                    {item.majorCategory}
                  </span>
                ) : null}
                {item.year ? (
                  <span className="text-[10px] text-muted-foreground">
                    {item.year}년
                  </span>
                ) : null}
                {item.extension ? (
                  <span className="text-[10px] text-muted-foreground">
                    .{item.extension}
                  </span>
                ) : null}
                {typeof item.score === "number" && item.score > 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    score {item.score.toFixed(2)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {item.snippet}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setViewTarget(item)}
                >
                  <Eye className="mr-1 size-3" />
                  문서 보기
                </Button>
                {item.href ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    asChild
                  >
                    <Link href={item.href}>업무로 이동</Link>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : !loading && !error && totalCorpus != null ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {searchedQuery || hasActiveFilters
            ? "조건에 맞는 사업문서가 없습니다."
            : "색인된 사업문서가 없습니다."}
        </p>
      ) : null}

      <DocumentSearchResultViewer
        result={viewTarget}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null)
        }}
      />
    </div>
  )
}
