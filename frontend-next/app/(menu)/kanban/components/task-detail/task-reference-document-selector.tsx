"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { openUploadedFileById } from "@/lib/files/open-file-item"
import {
  filterReferenceDocuments,
  isFileManagerDocument,
  mergeTaskReferenceDocuments,
} from "@/lib/kanban/task-reference-documents"
import { cn } from "@/lib/utils"
import type { EvaluationFile } from "@/services/kanban.task-detail.types"

const SEARCH_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "template", label: "기본틀" },
  { value: "plan", label: "사업계획서" },
  { value: "document", label: "첨부 파일" },
] as const

const FILES_PER_PAGE = 20

type TaskReferenceDocumentSelectorProps = {
  fixedFiles: EvaluationFile[]
  taskFiles: EvaluationFile[]
  selectedFileId: string
  onSelectFileId: (fileId: string) => void
  className?: string
}

export function TaskReferenceDocumentSelector({
  fixedFiles,
  taskFiles,
  selectedFileId,
  onSelectFileId,
  className,
}: TaskReferenceDocumentSelectorProps) {
  const [searchField, setSearchField] =
    useState<(typeof SEARCH_OPTIONS)[number]["value"]>("all")
  const [filePage, setFilePage] = useState(1)

  const allFiles = useMemo(
    () => mergeTaskReferenceDocuments(fixedFiles, taskFiles),
    [fixedFiles, taskFiles],
  )

  const filteredFiles = useMemo(
    () => filterReferenceDocuments(allFiles, searchField, fixedFiles),
    [allFiles, searchField, fixedFiles],
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFiles.length / FILES_PER_PAGE),
  )
  const pagedFiles = filteredFiles.slice(
    (filePage - 1) * FILES_PER_PAGE,
    filePage * FILES_PER_PAGE,
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground">사업 문서 선택</p>
        <Select
          value={searchField}
          onValueChange={(value) => {
            setSearchField(value as (typeof SEARCH_OPTIONS)[number]["value"])
            setFilePage(1)
          }}
        >
          <SelectTrigger className="ml-auto h-8 w-[140px] text-xs">
            <SelectValue placeholder="필터" />
          </SelectTrigger>
          <SelectContent>
            {SEARCH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border border-border bg-card p-1">
        {pagedFiles.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-muted-foreground">
            이 업무에 연결된 파일이 없습니다. 파일 관리에서 업무를 지정해
            업로드하세요.
          </li>
        ) : (
          pagedFiles.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => onSelectFileId(file.id)}
                onDoubleClick={() => {
                  if (!isFileManagerDocument(file)) return
                  void openUploadedFileById(file.id, {
                    name: file.name,
                    mimeType: file.mimeType,
                    fileType: file.fileType,
                  })
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  selectedFileId === file.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <FileText className="mt-0.5 size-4 shrink-0" />
                <span className="line-clamp-2 min-w-0 flex-1 leading-snug">
                  {file.name}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {file.type}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      {filteredFiles.length > FILES_PER_PAGE ? (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
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
      ) : null}
    </div>
  )
}
