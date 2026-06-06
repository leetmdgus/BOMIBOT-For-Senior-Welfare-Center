"use client"

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useParams } from "next/navigation"
import { Eye, Loader2 } from "lucide-react"

import { HwpxDownloadButton } from "@/components/common/hwpx-download-button"
import {
  PrintDocumentButton,
} from "@/components/common/print-document"
import { BusinessPlanEvaluationWorkspace } from "@/components/kanban/task-detail/business-plan-evaluation-workspace"
import { HwpxTemplateSelector } from "@/components/kanban/task-detail/hwpx-template-selector"
import { HwpxPreviewDialog } from "@/components/kanban/task-detail/hwpx-preview-dialog"
import { fetchBusinessEvaluationHwpxPreviewHtml } from "@/lib/hwpx/fetch-hwpx-preview"
import { loadEvaluationPerformanceTotals } from "@/components/kanban/task-detail/performance/evaluation-performance-totals"
import { mergeFlushedDocumentSections } from "@/lib/hwpx/document-sections-for-export"
import { downloadBusinessEvaluationHwpx } from "@/lib/hwpx/export-business-evaluation"
import {
  completeBusinessEvaluation,
  getBusinessEvaluation,
  getBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type { BusinessEvaluationData } from "@/services/kanban.task-detail.types"
import { Button } from "@/components/ui/button"

export function BusinessEvaluationTab() {
  const params = useParams<{ id: string }>()
  const taskId = params.id

  const [evaluationData, setEvaluationData] =
    useState<BusinessEvaluationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  /** 선택한 HWPX 양식 id (null = 기본 양식) */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)

  /** evaluationData가 로드된 뒤에만 갱신 — null 상태에서는 무시 */
  const updateEvaluation = useCallback<
    Dispatch<SetStateAction<BusinessEvaluationData>>
  >((action) => {
    setEvaluationData((prev) => {
      if (prev === null) return prev
      return typeof action === "function"
        ? (action as (current: BusinessEvaluationData) => BusinessEvaluationData)(
            prev,
          )
        : action
    })
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [evaluation, performanceTotals] = await Promise.all([
        getBusinessEvaluation(taskId),
        // 계획/실행 인원·예산·지출은 실적관리(계획·실적 입력관리) 합계에서 가져온다
        loadEvaluationPerformanceTotals(taskId).catch((error) => {
          console.error("실적관리 합계 로드 실패:", error)
          return null
        }),
      ])
      setEvaluationData({
        ...evaluation,
        ...(performanceTotals ?? {}),
        detailRows: [],
      })
      setIsEditMode(!evaluation.isCompleted)
    } catch (error) {
      console.error("사업평가 데이터 로드 실패:", error)
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }, [taskId])

  useEffect(() => {
    setHasLoadedOnce(false)
    setEvaluationData(null)
    setIsEditMode(false)
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  const handleCompleteOrEdit = async () => {
    if (!evaluationData) return

    if (evaluationData.isCompleted) {
      setIsEditMode(true)
      return
    }

    setIsSaving(true)
    try {
      const completed = await completeBusinessEvaluation(taskId)
      setEvaluationData(completed)
      setIsEditMode(false)
      alert("사업평가가 완료되었습니다. 칸반 보드에 완료로 표시됩니다.")
    } catch (error) {
      console.error("사업평가 완료 실패:", error)
      alert("완료 처리에 실패했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && !hasLoadedOnce) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">사업평가를 불러오는 중입니다.</p>
      </div>
    )
  }

  if (!evaluationData) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        사업평가 데이터를 불러올 수 없습니다.
      </p>
    )
  }

  const canEditEvaluation = isEditMode

  return (
    <div className="relative space-y-6">
      {isLoading ? (
        <p className="print-hide absolute right-0 top-0 z-10 flex items-center gap-2 rounded-md border bg-card/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="size-3.5 animate-spin" />
          새로고침 중…
        </p>
      ) : null}

      <div className="evaluation-workspace-chrome print-hide flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {canEditEvaluation ? (
            <>
              {isSaving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  저장 중… (한글 양식 파일 동기화)
                </span>
              ) : (
                "요약 표·추가 본문은 수정 즉시 자동 저장되며, 한글(.hwpx) 파일이 함께 갱신됩니다."
              )}
            </>
          ) : (
            "보기 모드 · 「수정」을 누르면 다시 편집할 수 있습니다."
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <HwpxTemplateSelector
            kind="evaluation"
            selectedTemplateId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
            defaultLabel="기본 사업평가서 양식"
            disabled={isSaving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => setTemplatePreviewOpen(true)}
          >
            <Eye className="mr-1.5 size-4" />
            양식 미리보기
          </Button>
          <PrintDocumentButton disabled={isSaving} />
          <HwpxDownloadButton
            disabled={isSaving}
            onDownload={async () => {
              let planForm = null
              try {
                const plan = await getBusinessPlan(taskId)
                planForm = plan.formData
              } catch {
                /* 계획서 없으면 평가서만 보냄 */
              }
              await downloadBusinessEvaluationHwpx(taskId, {
                evaluation: {
                  ...evaluationData,
                  sections: mergeFlushedDocumentSections(
                    evaluationData.sections ?? [],
                  ),
                },
                planForm,
                templateId: selectedTemplateId,
              })
            }}
          />
          <Button
            type="button"
            size="sm"
            className="min-w-[88px] bg-foreground text-background hover:bg-foreground/90"
            disabled={isSaving}
            onClick={() => void handleCompleteOrEdit()}
          >
            {evaluationData.isCompleted ? "수정" : "완료"}
          </Button>
        </div>
      </div>

      <BusinessPlanEvaluationWorkspace
        taskId={taskId}
        canEditEvaluation={canEditEvaluation}
        isSaving={isSaving}
        onSavingChange={setIsSaving}
        evaluationData={evaluationData}
        onEvaluationChange={updateEvaluation}
        onEvaluationSaved={updateEvaluation}
        isCompleted={evaluationData.isCompleted}
        onCompleteOrEdit={() => void handleCompleteOrEdit()}
        hideTopActionChrome
        templateId={selectedTemplateId}
      />

      <HwpxPreviewDialog
        open={templatePreviewOpen}
        onOpenChange={setTemplatePreviewOpen}
        title="최종사업평가서 양식 미리보기"
        description={
          selectedTemplateId
            ? "선택한 업로드 양식에 현재 내용을 채운 결과입니다."
            : "기본 양식에 현재 내용을 채운 결과입니다."
        }
        fetchHtml={() =>
          fetchBusinessEvaluationHwpxPreviewHtml(taskId, {
            evaluation: {
              ...evaluationData,
              sections: mergeFlushedDocumentSections(
                evaluationData.sections ?? [],
              ),
            },
            templateId: selectedTemplateId,
          })
        }
      />
    </div>
  )
}
