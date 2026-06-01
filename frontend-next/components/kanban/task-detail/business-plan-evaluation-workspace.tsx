"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { CollaborationLiveNotice } from "@/components/collaboration/collaboration-live-notice"
import { CollaborationPresenceBar } from "@/components/collaboration/collaboration-presence-bar"
import {
  PrintDocumentButton,
  PrintDocumentShell,
} from "@/components/common/print-document"
import { HwpxDownloadButton } from "@/components/common/hwpx-download-button"
import { BusinessEvaluationEditor } from "@/components/kanban/task-detail/business-evaluation-editor"
import { EvaluationFormActionBar } from "@/components/kanban/task-detail/evaluation-form-action-bar"
import { EvaluationSplitLayout } from "@/components/kanban/task-detail/evaluation-split-layout"
import { TaskReferenceDocumentSelector } from "@/components/kanban/task-detail/task-reference-document-selector"
import { TaskReferenceDocumentViewer } from "@/components/kanban/task-detail/task-reference-document-viewer"
import {
  defaultSelectedDocumentId,
  EVALUATION_LIVE_REFERENCE_FILE,
  mergeTaskReferenceDocuments,
} from "@/lib/kanban/task-reference-documents"
import { Button } from "@/components/ui/button"
import { downloadBusinessEvaluationHwpx } from "@/lib/hwpx/export-business-evaluation"
import { mergeFlushedDocumentSections } from "@/lib/hwpx/document-sections-for-export"
import { toSaveBusinessEvaluationPayload } from "@/lib/kanban/evaluation-save-payload"
import {
  getBusinessEvaluationTemplate,
  getBusinessPlan,
  getEvaluationFiles,
  getViewTogetherFixedFiles,
  saveBusinessEvaluation,
  saveTaskDocuments,
} from "@/services/kanban.task-detail.service"
import type { CollaborationMessage } from "@/lib/collaboration/types"
import { taskBusinessPlanRoom, taskEvaluationRoom } from "@/lib/collaboration/rooms"
import {
  useCollaborationRoom,
  useDebouncedCollaborationDraft,
} from "@/lib/collaboration/use-collaboration-room"
import { isCollaborationAvailable } from "@/lib/collaboration/ws-url"
import type {
  BusinessEvaluationData,
  BusinessPlanDocument,
  BusinessPlanFormData,
  EvaluationFile,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

const createId = () => crypto.randomUUID()

const EVAL_AUTO_SAVE_MS = 700

function evaluationSnapshot(evaluation: BusinessEvaluationData): string {
  return JSON.stringify(toSaveBusinessEvaluationPayload(evaluation))
}

type BusinessPlanEvaluationWorkspaceProps = {
  taskId: string
  canEditEvaluation: boolean
  isSaving: boolean
  onSavingChange: (saving: boolean) => void
  evaluationData: BusinessEvaluationData
  onEvaluationChange: Dispatch<SetStateAction<BusinessEvaluationData>>
  onEvaluationSaved: Dispatch<SetStateAction<BusinessEvaluationData>>
  isCompleted: boolean
  onCompleteOrEdit: () => void
  /** 사업평가 탭 상단에 인쇄·한글·완료가 있으면 중복 숨김 */
  hideTopActionChrome?: boolean
}

export function BusinessPlanEvaluationWorkspace({
  taskId,
  canEditEvaluation,
  isSaving,
  onSavingChange,
  evaluationData,
  onEvaluationChange,
  onEvaluationSaved,
  isCompleted,
  onCompleteOrEdit,
  hideTopActionChrome = false,
}: BusinessPlanEvaluationWorkspaceProps) {
  const router = useRouter()
  const { session } = useAuth()
  const lastLocalEditRef = useRef(0)
  const collaborationClientIdRef = useRef<string | null>(null)
  const lastSavedSnapshotRef = useRef("")
  const hasInitializedSnapshotRef = useRef(false)
  const sectionsStructureRef = useRef<string | null>(null)
  const [liveNotice, setLiveNotice] = useState<string | null>(null)

  const [planDocument, setPlanDocument] = useState<BusinessPlanDocument | null>(
    null,
  )
  const [documentFiles, setDocumentFiles] = useState<EvaluationFile[]>([])
  const [fixedFiles, setFixedFiles] = useState<EvaluationFile[]>([])
  const [planLoading, setPlanLoading] = useState(true)
  const [selectedFileId, setSelectedFileId] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [scrollToSectionId, setScrollToSectionId] = useState<string | null>(
    null,
  )
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const evaluationDataRef = useRef(evaluationData)
  evaluationDataRef.current = evaluationData

  function mergeEvaluationSaveResult(
    prev: BusinessEvaluationData,
    saved: BusinessEvaluationData,
    sentSnapshot: string,
  ): BusinessEvaluationData {
    const prevMatchesSent = evaluationSnapshot(prev) === sentSnapshot
    const savedMatchesSent = evaluationSnapshot(saved) === sentSnapshot
    if (prevMatchesSent && savedMatchesSent) {
      return saved
    }
    return { ...prev, hwpxFileId: saved.hwpxFileId }
  }

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

  useEffect(() => {
    lastSavedSnapshotRef.current = ""
    hasInitializedSnapshotRef.current = false
    sectionsStructureRef.current = null
  }, [taskId])

  useEffect(() => {
    if (hasInitializedSnapshotRef.current) return
    lastSavedSnapshotRef.current = evaluationSnapshot(evaluationData)
    sectionsStructureRef.current = evaluationData.sections
      .map((section) => `${section.id}:${section.type}`)
      .join("\u0000")
    hasInitializedSnapshotRef.current = true
  }, [evaluationData, taskId])

  const buildEvaluationDownloadPayload = useCallback(() => {
    const current = evaluationDataRef.current
    return toSaveBusinessEvaluationPayload({
      ...current,
      sections: mergeFlushedDocumentSections(current.sections ?? []),
    })
  }, [])

  const downloadEvaluationHwpx = useCallback(async () => {
    await downloadBusinessEvaluationHwpx(taskId, {
      evaluation: buildEvaluationDownloadPayload(),
      planForm: planDocument?.formData ?? null,
    })
  }, [buildEvaluationDownloadPayload, planDocument?.formData, taskId])

  const persistEvaluation = useCallback(async () => {
    const current = evaluationDataRef.current
    const flushedSections = mergeFlushedDocumentSections(current.sections ?? [])
    const payload = toSaveBusinessEvaluationPayload({
      ...current,
      sections: flushedSections,
    })
    const sentSnapshot = evaluationSnapshot({ ...current, sections: flushedSections })
    onSavingChange(true)
    try {
      const saved = await saveBusinessEvaluation(taskId, payload)
      onEvaluationSaved((prev) => {
        const merged = mergeEvaluationSaveResult(prev, saved, sentSnapshot)
        lastSavedSnapshotRef.current = evaluationSnapshot(merged)
        return merged
      })
      try {
        const files = await getEvaluationFiles(taskId)
        setDocumentFiles(files)
      } catch {
        /* 목록 갱신 실패는 저장과 무관 */
      }
      return saved
    } catch (error) {
      console.error("사업평가 저장 실패:", error)
      alert("저장에 실패했습니다.")
      return null
    } finally {
      onSavingChange(false)
    }
  }, [taskId, onEvaluationSaved, onSavingChange])

  useEffect(() => {
    if (!hasInitializedSnapshotRef.current) return

    const mayAutoSave = canEditEvaluation || evaluationData.isCompleted
    if (!mayAutoSave) return

    const snapshot = evaluationSnapshot(evaluationData)
    if (snapshot === lastSavedSnapshotRef.current) return

    if (Date.now() - lastLocalEditRef.current > 1600) {
      lastSavedSnapshotRef.current = snapshot
      return
    }

    const timer = window.setTimeout(() => {
      void persistEvaluation()
    }, EVAL_AUTO_SAVE_MS)

    return () => window.clearTimeout(timer)
  }, [canEditEvaluation, evaluationData, persistEvaluation])

  const sectionsStructureSignature = evaluationData.sections
    .map((section) => `${section.id}:${section.type}`)
    .join("\u0000")

  useEffect(() => {
    if (!hasInitializedSnapshotRef.current) return
    if (!canEditEvaluation) return
    if (sectionsStructureRef.current === sectionsStructureSignature) return

    const hadBaseline = sectionsStructureRef.current !== null
    sectionsStructureRef.current = sectionsStructureSignature
    if (hadBaseline) {
      lastLocalEditRef.current = Date.now()
      void persistEvaluation()
    }
  }, [
    sectionsStructureSignature,
    canEditEvaluation,
    persistEvaluation,
  ])

  const loadPlan = useCallback(async () => {
    setPlanLoading(true)
    try {
      const [plan, files, togetherFiles] = await Promise.all([
        getBusinessPlan(taskId),
        getEvaluationFiles(taskId),
        getViewTogetherFixedFiles(),
      ])
      setPlanDocument(plan)
      setDocumentFiles(files)
      const evalFixedFiles = [EVALUATION_LIVE_REFERENCE_FILE, ...togetherFiles]
      setFixedFiles(evalFixedFiles)
      const merged = mergeTaskReferenceDocuments(evalFixedFiles, files)
      setSelectedFileId((prev) =>
        merged.some((file) => file.id === prev)
          ? prev
          : defaultSelectedDocumentId(merged, { preferEvaluationLive: true }),
      )
    } catch (error) {
      console.error("사업계획서 로드 실패:", error)
    } finally {
      setPlanLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    setPlanDocument(null)
    setDocumentFiles([])
    setPlanLoading(true)
  }, [taskId])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const handleSaveAll = async () => {
    if (!planDocument) {
      await persistEvaluation()
      return
    }
    onSavingChange(true)
    const sentSnapshot = evaluationSnapshot(evaluationDataRef.current)
    try {
      const saved = await saveTaskDocuments(taskId, {
        plan: {
          formData: planDocument.formData,
          sections: planDocument.sections,
        },
        evaluation: toSaveBusinessEvaluationPayload(evaluationDataRef.current),
      })
      if (saved.plan) setPlanDocument(saved.plan)
      if (saved.evaluation) {
        onEvaluationSaved((prev) => {
          const merged = mergeEvaluationSaveResult(
            prev,
            saved.evaluation!,
            sentSnapshot,
          )
          lastSavedSnapshotRef.current = evaluationSnapshot(merged)
          return merged
        })
      }
      try {
        const files = await getEvaluationFiles(taskId)
        setDocumentFiles(files)
      } catch {
        /* 목록 갱신 실패는 저장과 무관 */
      }
    } catch (error) {
      console.error("문서 저장 실패:", error)
      alert("저장에 실패했습니다.")
    } finally {
      onSavingChange(false)
    }
  }

  const handleLoadPreviousEvaluation = async () => {
    if (
      !window.confirm(
        "이전에 작성된 사업평가서 양식을 불러옵니다. 슬롯·본문 영역이 초기화될 수 있습니다. 계속할까요?",
      )
    ) {
      return
    }

    try {
      const template = await getBusinessEvaluationTemplate(taskId)
      handleEvaluationChange((prev) => ({
        ...prev,
        performanceIndicator: template.performanceIndicator,
        evaluationTool: template.evaluationTool,
        keyFactorAnalysis: template.keyFactorAnalysis,
        goalAppropriacy: template.goalAppropriacy,
        suggestion: template.suggestion,
        detailRows: [],
        sections: template.sections.map((s) => ({
          ...s,
          id: createId(),
        })),
      }))
    } catch (error) {
      console.error("이전 양식 불러오기 실패:", error)
      alert("이전 양식을 불러오지 못했습니다.")
    }
  }

  const handleImportFromPlan = () => {
    if (!planDocument) return
    handleEvaluationChange((prev) => ({
      ...prev,
      programName: planDocument.formData.projectName,
      purpose: planDocument.formData.purpose,
      goals: [...planDocument.formData.goals],
      period: planDocument.formData.period,
      target: planDocument.formData.target,
      planCount: planDocument.formData.totalCount,
      planBudget: planDocument.formData.budget,
    }))
  }

  const addSection = (type: "heading" | "body") => {
    const section: EvaluationSection = {
      id: createId(),
      type,
      title: type === "heading" ? "제목을 입력하세요" : "",
      content: type === "body" ? "" : "",
    }
    handleEvaluationChange((prev) => ({
      ...prev,
      sections: [...prev.sections, section],
    }))
    setScrollToSectionId(section.id)
  }

  const planReadOnly = planDocument?.isCompleted ?? false

  const evaluationRoom =
    session?.regionId && taskId
      ? taskEvaluationRoom(session.regionId, taskId)
      : null
  const planRoom =
    session?.regionId && taskId
      ? taskBusinessPlanRoom(session.regionId, taskId)
      : null

  const handleCollaborationMessage = useCallback(
    (message: CollaborationMessage) => {
      if (!message.clientId) return
      if (message.clientId === collaborationClientIdRef.current) return

      if (message.type === "document.draft" || message.type === "document.saved") {
        const payload = message.payload as {
          evaluation?: BusinessEvaluationData
          plan?: BusinessPlanDocument | null
        } | undefined
        if (!payload) return
        if (
          message.type === "document.draft" &&
          Date.now() - lastLocalEditRef.current < 1600
        ) {
          return
        }
        if (payload.evaluation) onEvaluationChange(payload.evaluation)
        if (payload.plan !== undefined) setPlanDocument(payload.plan)
        if (message.type === "document.saved" && message.userName) {
          setLiveNotice(`${message.userName}님이 사업평가를 저장했습니다.`)
        }
      }
    },
    [onEvaluationChange],
  )

  const { clientId, presence, isConnected, publish, setFocus } =
    useCollaborationRoom(evaluationRoom, {
      enabled: isCollaborationAvailable(),
      onMessage: handleCollaborationMessage,
    })

  useCollaborationRoom(planRoom, {
    enabled: isCollaborationAvailable(),
    onMessage: (message) => {
      if (!message.clientId || message.clientId === collaborationClientIdRef.current) {
        return
      }
      if (message.type === "document.saved" || message.type === "document.draft") {
        const payload = message.payload as BusinessPlanDocument | undefined
        if (payload?.formData) setPlanDocument(payload)
        if (message.type === "document.saved" && message.userName) {
          setLiveNotice(`${message.userName}님이 사업계획서를 저장했습니다.`)
        }
      }
    },
  })

  useEffect(() => {
    collaborationClientIdRef.current = clientId
  }, [clientId])

  useEffect(() => {
    if (canEditEvaluation && isConnected) {
      setFocus("editing")
      return () => setFocus(null)
    }
    setFocus(null)
    return undefined
  }, [canEditEvaluation, isConnected, setFocus])

  useDebouncedCollaborationDraft(
    publish,
    { evaluation: evaluationData, plan: planDocument },
    { enabled: canEditEvaluation, isConnected },
  )

  const handleEvaluationChange = useCallback(
    (next: SetStateAction<BusinessEvaluationData>) => {
      lastLocalEditRef.current = Date.now()
      onEvaluationChange(next)
    },
    [onEvaluationChange],
  )

  return (
    <div className="space-y-4">
      <CollaborationPresenceBar
        presence={presence}
        isConnected={isConnected}
      />
      <CollaborationLiveNotice message={liveNotice} />
      {!hideTopActionChrome ? (
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
            "보기 모드 · 슈퍼비전만 수정할 수 있습니다."
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <PrintDocumentButton />
          <HwpxDownloadButton onDownload={downloadEvaluationHwpx} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEditEvaluation || isSaving || planLoading}
            onClick={handleImportFromPlan}
          >
            계획서 → 평가 반영
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-w-[88px] bg-foreground text-background hover:bg-foreground/90"
            disabled={isSaving}
            onClick={onCompleteOrEdit}
          >
            {isCompleted ? "수정" : "완료"}
          </Button>
        </div>
      </div>
      ) : (
        <div className="evaluation-workspace-chrome print-hide flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border/50 bg-card px-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEditEvaluation || isSaving || planLoading}
            onClick={handleImportFromPlan}
          >
            계획서 → 평가 반영
          </Button>
        </div>
      )}

      <EvaluationSplitLayout
        defaultShowReferencePanel
        documentSelector={
          <div className="space-y-3">
            <TaskReferenceDocumentSelector
              fixedFiles={fixedFiles}
              taskFiles={documentFiles}
              selectedFileId={selectedFileId}
              onSelectFileId={setSelectedFileId}
            />
          </div>
        }
        referencePanel={
          <TaskReferenceDocumentViewer
            taskId={taskId}
            selectedFileId={selectedFileId}
            fixedFiles={fixedFiles}
            taskFiles={documentFiles}
            planDocument={planDocument}
            planLoading={planLoading}
            evaluation={evaluationData}
          />
        }
        editor={
          <div className="flex w-full min-w-0 flex-col space-y-4 pb-6">
            <PrintDocumentShell className="mx-auto w-full max-w-none">
              <BusinessEvaluationEditor
                evaluation={evaluationData}
                canEdit={canEditEvaluation}
                taskId={taskId}
                datePickerOpen={datePickerOpen}
                onDatePickerOpenChange={setDatePickerOpen}
                onEvaluationChange={handleEvaluationChange}
                setSectionRef={setSectionRef}
                onAddHeading={() => addSection("heading")}
                onAddBody={() => addSection("body")}
                planProjectName={planDocument?.formData.projectName}
              />
            </PrintDocumentShell>

            <EvaluationFormActionBar
              canEdit={canEditEvaluation}
              isSaving={isSaving}
              onLoadPrevious={() => void handleLoadPreviousEvaluation()}
              onSave={() => void handleSaveAll()}
              onHwpxDownload={downloadEvaluationHwpx}
              hint={
                canEditEvaluation
                  ? isSaving
                    ? "자동 저장 중…"
                    : "요약 표·추가 본문은 수정 즉시 반영됩니다. 왼쪽 「작성 중인 사업평가서」에서 실시간으로 확인할 수 있습니다."
                  : "보기 모드 · 「수정」을 누르면 편집할 수 있습니다."
              }
              onClose={() => {
                router.push(`/kanban/task/${taskId}/performance`)
              }}
              className="sticky bottom-4 z-20"
            />
          </div>
        }
      />
    </div>
  )
}
