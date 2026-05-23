"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileStack } from "lucide-react"

import { HwpxDownloadButton } from "@/components/common/hwpx-download-button"
import { BusinessEvaluationEditor } from "@/components/kanban/task-detail/business-evaluation-editor"
import { BusinessPlanFloatingPanel } from "@/components/kanban/task-detail/business-plan-floating-panel"
import { EvaluationFormActionBar } from "@/components/kanban/task-detail/evaluation-form-action-bar"
import { EvaluationSplitLayout } from "@/components/kanban/task-detail/evaluation-split-layout"
import { EvaluationDocumentPanel } from "@/components/kanban/task-detail/evaluation-document-panel"
import { Button } from "@/components/ui/button"
import { downloadBusinessEvaluationHwpx } from "@/lib/hwpx/export-business-evaluation"
import { businessEvaluationData } from "@/lib/mocks/kanban.task-detail.mock"
import {
  getBusinessPlan,
  getEvaluationFiles,
  getViewTogetherFixedFiles,
  saveBusinessEvaluation,
  saveBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type {
  BusinessEvaluationData,
  BusinessPlanDocument,
  BusinessPlanFormData,
  EvaluationFile,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

const createId = () => crypto.randomUUID()

type BusinessPlanEvaluationWorkspaceProps = {
  taskId: string
  canEditEvaluation: boolean
  isSaving: boolean
  onSavingChange: (saving: boolean) => void
  evaluationData: BusinessEvaluationData
  onEvaluationChange: (next: BusinessEvaluationData) => void
  onEvaluationSaved: (saved: BusinessEvaluationData) => void
}

export function BusinessPlanEvaluationWorkspace({
  taskId,
  canEditEvaluation,
  isSaving,
  onSavingChange,
  evaluationData,
  onEvaluationChange,
  onEvaluationSaved,
}: BusinessPlanEvaluationWorkspaceProps) {
  const router = useRouter()
  const [planDocument, setPlanDocument] = useState<BusinessPlanDocument | null>(
    null,
  )
  const [documentFiles, setDocumentFiles] = useState<EvaluationFile[]>([])
  const [fixedFiles] = useState(() => getViewTogetherFixedFiles())
  const [planLoading, setPlanLoading] = useState(true)
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [scrollToSectionId, setScrollToSectionId] = useState<string | null>(
    null,
  )
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const setSectionRef = useCallback(
    (sectionId: string) => (element: HTMLDivElement | null) => {
      if (element) sectionRefs.current.set(sectionId, element)
      else sectionRefs.current.delete(sectionId)
    },
    [],
  )

  useEffect(() => {
    if (!scrollToSectionId) return
    const id = scrollToSectionId
    const timer = window.setTimeout(() => {
      sectionRefs.current.get(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      setScrollToSectionId(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [scrollToSectionId, evaluationData.sections])

  const loadPlan = useCallback(async () => {
    setPlanLoading(true)
    try {
      const [plan, files] = await Promise.all([
        getBusinessPlan(taskId),
        getEvaluationFiles(taskId),
      ])
      setPlanDocument(plan)
      setDocumentFiles(files)
    } catch (error) {
      console.error("사업계획서 로드 실패:", error)
    } finally {
      setPlanLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const persistPlan = async () => {
    if (!planDocument) return
    onSavingChange(true)
    try {
      const saved = await saveBusinessPlan(taskId, {
        formData: planDocument.formData,
      })
      setPlanDocument(saved)
    } catch (error) {
      console.error("사업계획서 저장 실패:", error)
      alert("사업계획서 저장에 실패했습니다.")
    } finally {
      onSavingChange(false)
    }
  }

  const persistEvaluation = async () => {
    onSavingChange(true)
    try {
      const saved = await saveBusinessEvaluation(taskId, {
        evaluationDate: evaluationData.evaluationDate,
        purpose: evaluationData.purpose,
        goals: evaluationData.goals.filter(Boolean),
        performanceIndicator: evaluationData.performanceIndicator,
        evaluationTool: evaluationData.evaluationTool,
        supervision: evaluationData.supervision,
        detailRows: evaluationData.detailRows,
        sections: evaluationData.sections,
        keyFactorAnalysis: evaluationData.keyFactorAnalysis,
        goalAppropriacy: evaluationData.goalAppropriacy,
        suggestion: evaluationData.suggestion,
      })
      onEvaluationSaved(saved)
    } catch (error) {
      console.error("사업평가 저장 실패:", error)
      alert("사업평가 저장에 실패했습니다.")
    } finally {
      onSavingChange(false)
    }
  }

  const handleSaveAll = async () => {
    await persistPlan()
    await persistEvaluation()
  }

  const handleLoadPreviousEvaluation = () => {
    if (
      !window.confirm(
        "이전에 작성된 사업평가서 양식을 불러옵니다. 슬롯·본문 영역이 초기화될 수 있습니다. 계속할까요?",
      )
    ) {
      return
    }

    const template = businessEvaluationData
    onEvaluationChange({
      ...evaluationData,
      performanceIndicator: template.performanceIndicator,
      evaluationTool: template.evaluationTool,
      keyFactorAnalysis: template.keyFactorAnalysis,
      goalAppropriacy: template.goalAppropriacy,
      suggestion: template.suggestion,
      sections: template.sections.map((s) => ({
        ...s,
        id: createId(),
      })),
    })
  }

  const handleImportFromPlan = () => {
    if (!planDocument) return
    onEvaluationChange({
      ...evaluationData,
      programName: planDocument.formData.projectName,
      purpose: planDocument.formData.purpose,
      goals: [...planDocument.formData.goals],
      period: planDocument.formData.period,
      target: planDocument.formData.target,
      planCount: planDocument.formData.totalCount,
      planBudget: planDocument.formData.budget,
    })
  }

  const addSection = (type: "heading" | "body") => {
    const section: EvaluationSection = {
      id: createId(),
      type,
      title: type === "heading" ? "제목을 입력하세요" : "",
      content: type === "body" ? "" : "",
    }
    onEvaluationChange({
      ...evaluationData,
      sections: [...evaluationData.sections, section],
    })
    setScrollToSectionId(section.id)
  }

  const planReadOnly = planDocument?.isCompleted ?? false

  return (
    <div className="space-y-4">
      <div className="evaluation-workspace-chrome print-hide flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {canEditEvaluation
            ? "왼쪽에서 평가서를 작성하고, 오른쪽 참고 계획서를 보며 「계획서 → 평가 반영」으로 내용을 가져올 수 있습니다."
            : "보기 모드 · 슈퍼비전만 수정할 수 있습니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDocPanel((v) => !v)}
          >
            <FileStack className="mr-2 size-4" />
            {showDocPanel ? "참고 문서 닫기" : "참고 문서"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEditEvaluation || isSaving || planLoading}
            onClick={handleImportFromPlan}
          >
            계획서 → 평가 반영
          </Button>
          <HwpxDownloadButton
            label="HWPX 다운로드"
            onDownload={async () => {
              await downloadBusinessEvaluationHwpx(
                evaluationData,
                planDocument?.formData ?? null,
              )
            }}
          />
        </div>
      </div>

      {showDocPanel ? (
        <EvaluationDocumentPanel
          evaluation={evaluationData}
          fixedFiles={fixedFiles}
          documentFiles={documentFiles}
        />
      ) : null}

      <EvaluationSplitLayout
        defaultShowPlanPanel
        left={
          <div className="mx-auto flex w-full min-w-0 flex-col items-center space-y-4 pb-6">
            <BusinessEvaluationEditor
              evaluation={evaluationData}
              canEdit={canEditEvaluation}
              datePickerOpen={datePickerOpen}
              onDatePickerOpenChange={setDatePickerOpen}
              onEvaluationChange={onEvaluationChange}
              setSectionRef={setSectionRef}
              onAddHeading={() => addSection("heading")}
              onAddBody={() => addSection("body")}
              planProjectName={planDocument?.formData.projectName}
            />

            <EvaluationFormActionBar
              canEdit={canEditEvaluation}
              isSaving={isSaving}
              onLoadPrevious={() => void handleLoadPreviousEvaluation()}
              onSave={() => void handleSaveAll()}
              onClose={() => {
                router.push(`/kanban/task/${taskId}/performance`)
              }}
              className="sticky bottom-4 z-20"
            />
          </div>
        }
        right={
          <BusinessPlanFloatingPanel
            taskId={taskId}
            planDocument={planDocument}
            isLoading={planLoading}
          />
        }
      />
    </div>
  )
}
