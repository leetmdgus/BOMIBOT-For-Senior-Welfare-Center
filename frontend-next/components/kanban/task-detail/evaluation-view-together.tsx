"use client"

import { ChevronLeft, ChevronRight, FileText, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type {
  BusinessEvaluationData,
  EvaluationFile,
} from "@/services/kanban.task-detail.types"

const SEARCH_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "template", label: "기본틀" },
  { value: "plan", label: "사업계획서" },
  { value: "document", label: "첨부 문서" },
]

interface EvaluationViewTogetherProps {
  evaluation: BusinessEvaluationData
  fixedFiles: EvaluationFile[]
  documentFiles: EvaluationFile[]
  selectedFileId: string | null
  onSelectFile: (fileId: string) => void
  onClearSelectedFile: () => void
  searchField: string
  onSearchFieldChange: (value: string) => void
  filePage: number
  onFilePageChange: (page: number) => void
  isZoomView: boolean
}

const FILES_PER_PAGE = 5

export function EvaluationViewTogether({
  evaluation,
  fixedFiles,
  documentFiles,
  selectedFileId,
  onSelectFile,
  onClearSelectedFile,
  searchField,
  onSearchFieldChange,
  filePage,
  onFilePageChange,
  isZoomView,
}: EvaluationViewTogetherProps) {
  const selectedFile =
    [...fixedFiles, ...documentFiles].find((file) => file.id === selectedFileId) ??
    null

  const showBrowseLayout = !selectedFileId
  const templateFile = fixedFiles.find((file) => file.id === "fixed-template")
  const planFile = fixedFiles.find((file) => file.id === "fixed-plan")

  const pagedFiles = documentFiles.slice(
    (filePage - 1) * FILES_PER_PAGE,
    filePage * FILES_PER_PAGE
  )
  const totalPages = Math.max(1, Math.ceil(documentFiles.length / FILES_PER_PAGE))

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="print-hide mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={searchField} onValueChange={onSearchFieldChange}>
          <SelectTrigger className="w-[180px]">
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

        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Plus className="size-4" />
          파일 추가
        </Button>
      </div>

      {showBrowseLayout ? (
        <div
          className={cn(
            "grid gap-4",
            isZoomView ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[1fr_220px]"
          )}
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <DocumentPreviewCard
                badge="기본틀"
                title={templateFile?.name ?? "기본틀"}
                subtitle="사회복지사업 최종사업평가서"
                evaluation={evaluation}
                highlightDate
              />
              <DocumentPreviewCard
                badge="사업계획서"
                title={planFile?.name ?? "사업계획서"}
                subtitle={evaluation.programName}
                evaluation={evaluation}
              />
            </div>
          </div>

          {!isZoomView ? (
            <aside className="flex flex-col">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                첨부 문서
              </p>
              <ul className="flex-1 space-y-1">
                {pagedFiles.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => onSelectFile(file.id)}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="line-clamp-2">{file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={filePage <= 1}
                  onClick={() => onFilePageChange(filePage - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => onFilePageChange(page)}
                      className={cn(
                        "min-w-6 rounded px-1",
                        filePage === page
                          ? "font-semibold text-primary"
                          : "hover:text-foreground"
                      )}
                    >
                      {page}
                    </button>
                  )
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={filePage >= totalPages}
                  onClick={() => onFilePageChange(filePage + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {selectedFile?.name}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSelectedFile}
            >
              목록으로
            </Button>
          </div>
          <DocumentPreviewCard
            badge={selectedFile?.type ?? "문서"}
            title={selectedFile?.name ?? "문서"}
            subtitle="함께보기 문서"
            evaluation={evaluation}
            highlightDate
            large
          />
        </div>
      )}
    </div>
  )
}

function DocumentPreviewCard({
  badge,
  title,
  subtitle,
  evaluation,
  highlightDate,
  large,
}: {
  badge: string
  title: string
  subtitle: string
  evaluation: BusinessEvaluationData
  highlightDate?: boolean
  large?: boolean
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-white",
        large && "min-h-[420px]"
      )}
    >
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        {badge}
      </div>
      <div className="p-4">
        <h4 className="mb-1 text-center text-sm font-semibold">{subtitle}</h4>
        <p className="mb-4 text-center text-xs text-muted-foreground">{title}</p>

        <table className="w-full border-collapse border border-gray-300 text-xs">
          <tbody>
            <PreviewRow label="사업팀" value={evaluation.team} />
            <PreviewRow label="담당자" value={evaluation.manager} />
            <PreviewRow label="사업기간" value={evaluation.period} />
            <PreviewRow
              label="평가일"
              value={evaluation.evaluationDate}
              highlight={highlightDate}
            />
            <PreviewRow label="프로그램명" value={evaluation.programName} />
            <PreviewRow label="대상" value={evaluation.target} />
            <PreviewRow label="계획" value={evaluation.planCount} />
            <PreviewRow label="예산" value={evaluation.planBudget} />
            <PreviewRow label="실적" value={evaluation.actualCount} />
            <PreviewRow label="지출" value={evaluation.actualExpense} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <tr>
      <th className="w-20 border border-gray-300 bg-gray-50 px-2 py-1.5 text-center font-medium">
        {label}
      </th>
      <td
        className={cn(
          "border border-gray-300 px-2 py-1.5",
          highlight && "bg-primary/5 font-medium text-primary"
        )}
      >
        {value}
      </td>
    </tr>
  )
}
