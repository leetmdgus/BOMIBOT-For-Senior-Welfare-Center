"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getEvaluationDocumentPreviewHtml } from "@/lib/mocks/kanban.evaluation-document-preview.mock"
import { cn } from "@/lib/utils"
import type {
  BusinessEvaluationData,
  EvaluationFile,
} from "@/services/kanban.task-detail.types"

const SEARCH_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "template", label: "기본틀·계획" },
  { value: "plan", label: "사업계획서" },
  { value: "document", label: "첨부 문서" },
]

const FILES_PER_PAGE = 6

type EvaluationDocumentPanelProps = {
  evaluation: BusinessEvaluationData
  fixedFiles: EvaluationFile[]
  documentFiles: EvaluationFile[]
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function EvaluationDocumentPanel({
  evaluation,
  fixedFiles,
  documentFiles,
  collapsed = false,
  onCollapsedChange,
}: EvaluationDocumentPanelProps) {
  const [searchField, setSearchField] = useState("all")
  const [filePage, setFilePage] = useState(1)
  const [selectedFileId, setSelectedFileId] = useState<string>(
    () => documentFiles[0]?.id ?? fixedFiles[0]?.id ?? "",
  )

  const allFiles = useMemo(
    () => [...fixedFiles, ...documentFiles],
    [fixedFiles, documentFiles],
  )

  const filteredFiles = useMemo(() => {
    if (searchField === "all") return allFiles
    if (searchField === "template") {
      return fixedFiles
    }
    if (searchField === "plan") {
      return allFiles.filter(
        (f) => f.type.includes("계획") || f.id === "fixed-plan",
      )
    }
    return documentFiles
  }, [allFiles, documentFiles, fixedFiles, searchField])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFiles.length / FILES_PER_PAGE),
  )
  const pagedFiles = filteredFiles.slice(
    (filePage - 1) * FILES_PER_PAGE,
    filePage * FILES_PER_PAGE,
  )

  const selectedFile =
    allFiles.find((f) => f.id === selectedFileId) ?? allFiles[0] ?? null

  const previewHtml = selectedFile
    ? getEvaluationDocumentPreviewHtml(selectedFile.id, evaluation)
    : ""

  if (collapsed) {
    return (
      <div className="print-hide flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => onCollapsedChange?.(false)}
        >
          <PanelLeftOpen className="size-4" />
          참고 문서
        </Button>
      </div>
    )
  }

  return (
    <aside className="print-hide flex max-h-[calc(100vh-10rem)] flex-col gap-3 xl:sticky xl:top-4" aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">참고 문서</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => onCollapsedChange?.(true)}
        >
          <PanelLeftClose className="size-3.5" />
          접기
        </Button>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue placeholder="검색필드" />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 shrink-0">
            <Plus className="size-3.5" />
            추가
          </Button>
        </div>

        <ul className="max-h-44 shrink-0 space-y-0.5 overflow-y-auto border-b border-border p-2">
          {pagedFiles.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => setSelectedFileId(file.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                  selectedFileId === file.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <FileText className="mt-0.5 size-4 shrink-0" />
                <span className="line-clamp-2 leading-snug">{file.name}</span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {file.type}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center gap-1 border-b border-border py-2 text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={filePage <= 1}
            onClick={() => setFilePage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span>
            {filePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={filePage >= totalPages}
            onClick={() => setFilePage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="min-h-[280px] flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">
              {selectedFile?.name ?? "문서"}
            </p>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {selectedFile?.type}
            </span>
          </div>
          <div
            className="prose prose-sm max-w-none rounded-lg border border-gray-200 bg-white p-3"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            왼쪽 문서를 보면서 오른쪽 평가서를 작성하세요. 목록에서 다른
            첨부 파일을 선택할 수 있습니다.
          </p>
        </div>
      </div>
    </aside>
  )
}
