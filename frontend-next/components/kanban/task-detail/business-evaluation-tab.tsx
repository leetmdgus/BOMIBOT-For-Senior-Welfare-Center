"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { HwpxDownloadButton } from "@/components/common/hwpx-download-button"
import {
  PrintDocumentButton,
  PrintDocumentShell,
} from "@/components/common/print-document"
import { BusinessPlanEvaluationWorkspace } from "@/components/kanban/task-detail/business-plan-evaluation-workspace"
import { downloadBusinessEvaluationHwpx } from "@/lib/hwpx/export-business-evaluation"
import { Button } from "@/components/ui/button"
import {
  completeBusinessEvaluation,
  getBusinessEvaluation,
  getBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type { BusinessEvaluationData } from "@/services/kanban.task-detail.types"

export function BusinessEvaluationTab() {
  const params = useParams<{ id: string }>()
  const taskId = params.id

  const [evaluationData, setEvaluationData] =
    useState<BusinessEvaluationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const evaluation = await getBusinessEvaluation(taskId)
      setEvaluationData(evaluation)
      setIsEditMode(!evaluation.isCompleted)
    } catch (error) {
      console.error("사업평가 데이터 로드 실패:", error)
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
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

  if (isLoading && !evaluationData) {
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

  const canEditEvaluation = isEditMode && !isSaving

  return (
    <div className="space-y-6">
      <div className="print-hide flex flex-wrap items-center justify-end gap-2">
        <PrintDocumentButton />
        <HwpxDownloadButton
          onDownload={async () => {
            let planForm = null
            try {
              const plan = await getBusinessPlan(taskId)
              planForm = plan.formData
            } catch {
              /* 계획서 없으면 평가서만 보냄 */
            }
            await downloadBusinessEvaluationHwpx(evaluationData, planForm)
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

      <PrintDocumentShell className="mx-auto w-full max-w-none">
        <BusinessPlanEvaluationWorkspace
          taskId={taskId}
          canEditEvaluation={canEditEvaluation}
          isSaving={isSaving}
          onSavingChange={setIsSaving}
          evaluationData={evaluationData}
          onEvaluationChange={setEvaluationData}
          onEvaluationSaved={setEvaluationData}
        />
      </PrintDocumentShell>
    </div>
  )
}
