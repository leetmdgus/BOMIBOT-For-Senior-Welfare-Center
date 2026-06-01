"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PrintDocumentShell } from "@/components/common/print-document"
import { openUploadedFileById } from "@/lib/files/open-file-item"

import { OfficePreviewContent } from "@/components/files/office-preview-content"
import { BusinessEvaluationEditor } from "@/components/kanban/task-detail/business-evaluation-editor"
import { BusinessPlanEditor } from "@/components/kanban/task-detail/business-plan-editor"
import { isOfficePreviewableFile } from "@/lib/files/office-preview"
import { getEvaluationDocumentPreviewHtml } from "@/lib/evaluation-document-preview"
import {
  isBuiltinTemplateDocument,
  isEvaluationLivePreviewDocument,
  isFileManagerDocument,
  isPlanLivePreviewDocument,
  mergeTaskReferenceDocuments,
} from "@/lib/kanban/task-reference-documents"
import {
  loadFileManagerReferenceContent,
  revokeLoadedReferenceContent,
  type LoadedReferenceContent,
} from "@/lib/kanban/load-file-reference-content"
import { cn } from "@/lib/utils"
import type {
  BusinessEvaluationData,
  BusinessPlanDocument,
  EvaluationFile,
} from "@/services/kanban.task-detail.types"

type TaskReferenceDocumentViewerProps = {
  taskId?: string
  selectedFileId: string
  fixedFiles: EvaluationFile[]
  taskFiles: EvaluationFile[]
  planDocument: BusinessPlanDocument | null
  planLoading?: boolean
  evaluation?: BusinessEvaluationData | null
  className?: string
}

export function TaskReferenceDocumentViewer({
  taskId,
  selectedFileId,
  fixedFiles,
  taskFiles,
  planDocument,
  planLoading = false,
  evaluation,
  className,
}: TaskReferenceDocumentViewerProps) {
  const allFiles = useMemo(
    () => mergeTaskReferenceDocuments(fixedFiles, taskFiles),
    [fixedFiles, taskFiles],
  )

  const selectedFile =
    allFiles.find((file) => file.id === selectedFileId) ?? allFiles[0] ?? null

  const [fileContent, setFileContent] = useState<LoadedReferenceContent | null>(
    null,
  )
  const [fileLoading, setFileLoading] = useState(false)

  useEffect(() => {
    revokeLoadedReferenceContent(fileContent)
    setFileContent(null)

    if (!selectedFile || !isFileManagerDocument(selectedFile)) {
      setFileLoading(false)
      return
    }
    if (isEvaluationLivePreviewDocument(selectedFile, evaluation)) {
      setFileLoading(false)
      return
    }

    let cancelled = false
    setFileLoading(true)

    void loadFileManagerReferenceContent(selectedFile.id, {
      mimeType: selectedFile.mimeType,
      fileType: selectedFile.fileType,
      name: selectedFile.name,
      hasContent: selectedFile.hasContent,
      contentMissing: selectedFile.contentMissing,
    })
      .then((loaded) => {
        if (!cancelled) setFileContent(loaded)
      })
      .catch(() => {
        if (!cancelled) {
          setFileContent({
            kind: "unsupported",
            message: "파일 미리보기를 불러오지 못했습니다.",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setFileLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke previous blob on file change
  }, [
    selectedFile?.id,
    selectedFile?.mimeType,
    selectedFile?.fileType,
    selectedFile?.name,
    selectedFile?.hasContent,
    selectedFile?.contentMissing,
    evaluation,
  ])

  useEffect(() => {
    return () => revokeLoadedReferenceContent(fileContent)
  }, [fileContent])

  const showEvaluationMirror =
    Boolean(selectedFile && evaluation) &&
    isEvaluationLivePreviewDocument(selectedFile, evaluation)

  const showPlanMirror =
    Boolean(selectedFile && planDocument) &&
    isPlanLivePreviewDocument(selectedFile)

  const templateHtml =
    selectedFile &&
    evaluation &&
    isBuiltinTemplateDocument(selectedFile) &&
    !showEvaluationMirror
      ? getEvaluationDocumentPreviewHtml(selectedFile.id, evaluation)
      : ""

  const subtitle = showEvaluationMirror
    ? "작성 내용 실시간 반영 · 읽기 전용"
    : showPlanMirror
      ? "작성 내용 실시간 반영 · 읽기 전용"
      : "참고 문서 · 읽기 전용"

  return (
    <aside
      className={cn(
        "task-reference-viewer flex h-full w-full min-h-0 flex-col",
        className,
      )}
      aria-label="참고 문서 미리보기"
    >
      <div className="mb-2 flex shrink-0 items-center gap-2 border border-black/20 bg-[#f2f2f2] px-3 py-2">
        <FileText className="size-4 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {selectedFile?.name ?? "문서"}
          </p>
          <p className="text-[10px] text-neutral-600">{subtitle}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {selectedFile && isFileManagerDocument(selectedFile) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={() =>
                void openUploadedFileById(selectedFile.id, {
                  name: selectedFile.name,
                  mimeType: selectedFile.mimeType,
                  fileType: selectedFile.fileType,
                })
              }
            >
              <ExternalLink className="size-3" />
              열기
            </Button>
          ) : null}
          {selectedFile ? (
            <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {selectedFile.type}
            </span>
          ) : null}
        </div>
      </div>

      <div className="reference-plan-panel__scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-b-lg border border-t-0 border-border bg-white">
        {!selectedFile ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            사업 문서를 선택하세요.
          </p>
        ) : showEvaluationMirror && evaluation ? (
          <BusinessEvaluationEditor
            key={evaluation.sections.map((section) => section.id).join("\u0000")}
            evaluation={evaluation}
            canEdit={false}
            referenceMode
            taskId={taskId}
            datePickerOpen={false}
            onDatePickerOpenChange={() => {}}
            onEvaluationChange={() => {}}
            planProjectName={planDocument?.formData.projectName}
          />
        ) : showPlanMirror && planDocument ? (
          planLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              사업계획서를 불러오는 중…
            </div>
          ) : (
            <PrintDocumentShell className="mx-auto w-full max-w-none">
              <BusinessPlanEditor
                formData={planDocument.formData}
                sections={planDocument.sections}
                taskId={taskId}
                readOnly
                referenceMode
                onFormDataChange={() => {}}
                onSectionsChange={() => {}}
              />
            </PrintDocumentShell>
          )
        ) : isBuiltinTemplateDocument(selectedFile) ? (
          <div
            className="prose prose-sm max-w-none p-4 [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{ __html: templateHtml }}
          />
        ) : isFileManagerDocument(selectedFile) ? (
          fileLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              파일을 불러오는 중…
            </div>
          ) : fileContent?.kind === "html" ? (
            isOfficePreviewableFile(
              selectedFile.name,
              selectedFile.fileType,
            ) ? (
              <OfficePreviewContent
                html={fileContent.html}
                className="p-4"
              />
            ) : (
              <div
                className="prose prose-sm max-w-none p-4 [&_img]:max-w-full [&_img]:h-auto"
                dangerouslySetInnerHTML={{ __html: fileContent.html }}
              />
            )
          ) : fileContent?.kind === "image" ? (
            <div className="flex justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileContent.objectUrl}
                alt={selectedFile.name}
                className="max-h-[70vh] max-w-full rounded-md border object-contain"
              />
            </div>
          ) : fileContent?.kind === "iframe" ? (
            <iframe
              title={selectedFile.name}
              src={fileContent.objectUrl}
              className="h-[min(70vh,800px)] w-full border-0"
            />
          ) : (
            <p className="py-16 px-4 text-center text-sm text-muted-foreground">
              {fileContent?.kind === "unsupported"
                ? fileContent.message
                : "미리보기를 준비 중입니다."}
            </p>
          )
        ) : (
          <div
            className="prose prose-sm max-w-none p-4 [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{
              __html:
                evaluation &&
                getEvaluationDocumentPreviewHtml(selectedFile.id, evaluation),
            }}
          />
        )}
      </div>
    </aside>
  )
}
