"use client"

import { Download, Save, X } from "lucide-react"

import { PdfDownloadButton } from "@/components/common/pdf-download-button"
import { PrintDocumentButton } from "@/components/common/print-document"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EvaluationFormActionBarProps = {
  canEdit: boolean
  isSaving: boolean
  onLoadPrevious?: () => void
  onSave: () => void
  onClose: () => void
  className?: string
  /** false면 「이전 양식 불러오기」 숨김 (사업계획서 등) */
  showLoadPrevious?: boolean
  hint?: string
  /** true면 인쇄·PDF 다운로드 버튼을 함께 표시 */
  showDownloadActions?: boolean
}

/** 평가서 하단 저장·불러오기 (고정) */
export function EvaluationFormActionBar({
  canEdit,
  isSaving,
  onLoadPrevious,
  onSave,
  onClose,
  className,
  showLoadPrevious = true,
  hint,
  showDownloadActions = false,
}: EvaluationFormActionBarProps) {
  return (
    <div
      className={cn(
        "evaluation-form-action-bar print-hide rounded-xl border border-border bg-card/95 p-4 shadow-md backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {hint ??
            (canEdit
              ? "요약·본문 작성 후 저장하세요."
              : "보기 모드 · 슈퍼비전 항목만 수정 가능합니다.")}
        </p>
        <div className="flex flex-wrap gap-2">
          {showDownloadActions ? (
            <>
              <PrintDocumentButton disabled={isSaving} />
              <PdfDownloadButton disabled={isSaving} />
            </>
          ) : null}
          {showLoadPrevious && onLoadPrevious ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || isSaving}
              onClick={onLoadPrevious}
            >
              <Download className="mr-2 size-4" />
              이전 양식 불러오기
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={onSave}
          >
            <Save className="mr-2 size-4" />
            {isSaving ? "저장 중…" : "저장"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="mr-2 size-4" />
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
