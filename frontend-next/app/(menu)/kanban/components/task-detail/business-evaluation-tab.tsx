"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { PdfDownloadButton } from "@common/components/pdf-download-button"
import {
  PrintDocumentButton,
} from "@common/components/print-document"
import { BusinessPlanEvaluationWorkspace } from "@menu/kanban/components/task-detail/business-plan-evaluation-workspace"
import { HwpxTemplateSelector } from "@menu/kanban/components/task-detail/hwpx-template-selector"
import { loadEvaluationPerformanceTotals } from "@menu/kanban/components/task-detail/performance/evaluation-performance-totals"
import { prefillDocumentTemplate } from "@/services/document-templates.api.service"
import type { HwpxFrontendJson } from "@/services/document-templates.types"
import {
  completeBusinessEvaluation,
  getBusinessEvaluation,
  getBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type { BusinessEvaluationData } from "@/services/kanban.task-detail.types"
import type { KanbanProject } from "@/services/kanban.board.types"
import { getProjects } from "@/services/kanban.board.service"
import { getCurrentYearString } from "@/lib/current-year"
import { resolveTaskTeamAndManager } from "@/lib/kanban/resolve-card-title"
import { fillEvaluationCommonFields } from "@/lib/kanban/sync-evaluation-from-plan"
import { Button } from "@/components/ui/button"
import { useToast } from "@common/hooks/use-toast"

export function BusinessEvaluationTab() {
  const params = useParams<{ id: string }>()
  const taskId = params.id
  const { toast } = useToast()

  const [evaluationData, setEvaluationData] =
    useState<BusinessEvaluationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  /** 선택한 HWPX 양식 id (null = 기본 양식) */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  /** 선택 양식 WYSIWYG 편집 상태 (요약 값 프리필 후 직접 편집) */
  const [templateJson, setTemplateJson] = useState<HwpxFrontendJson | null>(null)
  const evaluationDataRef = useRef<BusinessEvaluationData | null>(null)
  evaluationDataRef.current = evaluationData

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
      const [evaluation, performanceTotals, plan, projects] = await Promise.all([
        getBusinessEvaluation(taskId),
        // 계획/실행 인원·예산·지출은 실적관리(계획·실적 입력관리) 합계에서 가져온다
        loadEvaluationPerformanceTotals(taskId).catch((error) => {
          console.error("실적관리 합계 로드 실패:", error)
          return null
        }),
        // 사업팀·담당자·기간·대상·목적·목표는 사업계획서·카드에서 비어 있을 때만 채운다
        getBusinessPlan(taskId).catch(() => null),
        getProjects(getCurrentYearString()).catch(() => [] as KanbanProject[]),
      ])
      const card = resolveTaskTeamAndManager(taskId, projects)
      const base: BusinessEvaluationData = {
        ...evaluation,
        ...(performanceTotals ?? {}),
        detailRows: [],
      }
      setEvaluationData(
        fillEvaluationCommonFields(base, plan?.formData ?? null, card),
      )
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

  // 선택 양식이 바뀌면 현재 평가값으로 프리필한 frontendJson 로드(이후 양식 위에서 직접 편집)
  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateJson(null)
      return
    }
    const current = evaluationDataRef.current
    if (!current) return
    let cancelled = false
    prefillDocumentTemplate(
      selectedTemplateId,
      "evaluation",
      current as unknown as Record<string, unknown>,
    )
      .then((fj) => {
        if (!cancelled) setTemplateJson(fj)
      })
      .catch((error) => {
        if (cancelled) return
        setTemplateJson(null)
        toast({
          title: "선택한 양식을 불러오지 못했습니다.",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        })
      })
    return () => {
      cancelled = true
    }
  }, [selectedTemplateId, toast])

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
          <PrintDocumentButton disabled={isSaving} />
          <PdfDownloadButton disabled={isSaving} />
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
        templateJson={templateJson}
        onTemplateJsonChange={setTemplateJson}
      />
    </div>
  )
}
