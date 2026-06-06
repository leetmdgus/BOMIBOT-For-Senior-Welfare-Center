"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Eye, Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { CollaborationLiveNotice } from "@/components/collaboration/collaboration-live-notice"
import { CollaborationPresenceBar } from "@/components/collaboration/collaboration-presence-bar"
import {
  PrintDocumentButton,
  PrintDocumentShell,
} from "@/components/common/print-document"
import { HwpxDownloadButton } from "@/components/common/hwpx-download-button"
import { downloadBusinessPlanHwpx } from "@/lib/hwpx/export-business-plan"
import { mergeFlushedDocumentSections } from "@/lib/hwpx/document-sections-for-export"
import { EvaluationSplitLayout } from "@/components/kanban/task-detail/evaluation-split-layout"
import { EvaluationFormActionBar } from "@/components/kanban/task-detail/evaluation-form-action-bar"
import { TaskReferenceDocumentSelector } from "@/components/kanban/task-detail/task-reference-document-selector"
import { TaskReferenceDocumentViewer } from "@/components/kanban/task-detail/task-reference-document-viewer"
import { HwpxTemplateSelector } from "@/components/kanban/task-detail/hwpx-template-selector"
import { HwpxPreviewDialog } from "@/components/kanban/task-detail/hwpx-preview-dialog"
import { fetchBusinessPlanHwpxPreviewHtml } from "@/lib/hwpx/fetch-hwpx-preview"
import {
  defaultSelectedDocumentId,
  mergeTaskReferenceDocuments,
  PLAN_LIVE_REFERENCE_FILE,
} from "@/lib/kanban/task-reference-documents"
import {
  getBusinessPlan,
  getEvaluationFiles,
  getViewTogetherFixedFiles,
  saveBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type { EvaluationFile } from "@/services/kanban.task-detail.types"
import type {
  BusinessPlanDocument,
  BusinessPlanFormData,
  BusinessPlanSection,
} from "@/services/kanban.task-detail.types"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { CollaborationMessage } from "@/lib/collaboration/types"
import { taskBusinessPlanRoom } from "@/lib/collaboration/rooms"
import {
  useCollaborationRoom,
  useDebouncedCollaborationDraft,
} from "@/lib/collaboration/use-collaboration-room"
import { isCollaborationAvailable } from "@/lib/collaboration/ws-url"

import { BusinessPlanEditor } from "./business-plan-editor"
import { syncPlanFormFromPerformance } from "@/lib/kanban/load-performance-sub-project-names"
import { resolveTaskManagerLabel } from "@/lib/kanban/resolve-card-title"
import { getProjects } from "@/services/kanban.board.service"
import { getCurrentYearString } from "@/lib/current-year"

function emptyBusinessPlanFormData(): BusinessPlanFormData {
  return {
    projectName: "",
    purpose: "",
    goals: [],
    period: "",
    target: "",
    totalCount: "",
    budget: "",
    budgetCategory: "",
    manager: "",
    subProjects: [],
  }
}

const PLAN_AUTO_SAVE_MS = 700

function planDocumentSnapshot(document: {
  formData: BusinessPlanFormData
  sections: BusinessPlanSection[]
  isCompleted?: boolean
}): string {
  return JSON.stringify({
    formData: document.formData,
    sections: document.sections,
    isCompleted: document.isCompleted,
  })
}

export function BusinessPlanTab() {
  const params = useParams()
  const router = useRouter()
  const taskId = typeof params.id === "string" ? params.id : ""
  const { toast } = useToast()
  const { session } = useAuth()
  const lastLocalEditRef = useRef(0)
  const collaborationClientIdRef = useRef<string | null>(null)
  const lastSavedSnapshotRef = useRef("")
  const sectionsStructureRef = useRef<string | null>(null)
  const [liveNotice, setLiveNotice] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isEditMode, setIsEditMode] = useState(true)
  const [sections, setSections] = useState<BusinessPlanSection[]>([])
  const [formData, setFormData] = useState<BusinessPlanFormData>(emptyBusinessPlanFormData)
  const [documentFiles, setDocumentFiles] = useState<EvaluationFile[]>([])
  const [fixedFiles, setFixedFiles] = useState<EvaluationFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState("")
  /** 선택한 HWPX 양식 id (null = 기본 양식) */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)

  /** 저장 중에도 편집 가능 — 자동 저장과 충돌 방지 */
  const canEditPlan = !isCompleted || isEditMode

  const collaborationRoom =
    session?.regionId && taskId
      ? taskBusinessPlanRoom(session.regionId, taskId)
      : null

  const handleCollaborationMessage = useCallback(
    (message: CollaborationMessage) => {
      if (!message.clientId) return
      const isRemote = message.clientId !== collaborationClientIdRef.current

      if (
        isRemote &&
        (message.type === "document.draft" || message.type === "document.saved")
      ) {
        const payload = message.payload as Partial<BusinessPlanDocument> | undefined
        if (!payload) return
        if (
          message.type === "document.draft" &&
          Date.now() - lastLocalEditRef.current < 1600
        ) {
          return
        }
        if (payload.formData) setFormData(payload.formData)
        if (payload.sections) {
          setSections(payload.sections)
          sectionsStructureRef.current = payload.sections
            .map((section) => `${section.id}:${section.type}`)
            .join("\u0000")
        }
        if (payload.isCompleted !== undefined) {
          setIsCompleted(Boolean(payload.isCompleted))
          setIsEditMode(!payload.isCompleted)
        }
        if (message.type === "document.saved" && message.userName) {
          setLiveNotice(`${message.userName}님이 사업계획서를 저장했습니다.`)
        }
      }
    },
    [],
  )

  const { clientId, presence, isConnected, publish, setFocus } =
    useCollaborationRoom(collaborationRoom, {
      enabled: isCollaborationAvailable(),
      onMessage: handleCollaborationMessage,
    })

  useEffect(() => {
    collaborationClientIdRef.current = clientId
  }, [clientId])

  useEffect(() => {
    if (canEditPlan && isConnected) {
      setFocus("editing")
      return () => setFocus(null)
    }
    setFocus(null)
    return undefined
  }, [canEditPlan, isConnected, setFocus])

  useDebouncedCollaborationDraft(
    publish,
    { formData, sections, isCompleted },
    { enabled: canEditPlan, isConnected },
  )

  const applyDocument = useCallback(
    (
      document: BusinessPlanDocument,
      options?: { syncEditMode?: boolean; syncSavedSnapshot?: boolean },
    ) => {
      setFormData(document.formData)
      setSections(document.sections ?? [])
      sectionsStructureRef.current = (document.sections ?? [])
        .map((section) => `${section.id}:${section.type}`)
        .join("\u0000")
      setIsCompleted(Boolean(document.isCompleted))
      if (options?.syncEditMode !== false) {
        setIsEditMode(!document.isCompleted)
      }
      if (options?.syncSavedSnapshot !== false) {
        lastSavedSnapshotRef.current = planDocumentSnapshot(document)
      }
    },
    [],
  )

  const persist = useCallback(
    async (
      patch: Partial<BusinessPlanDocument> = {},
    ): Promise<BusinessPlanDocument | null> => {
      if (!taskId) return null

      setIsSaving(true)
      try {
        const flushedSections = mergeFlushedDocumentSections(sections)
        const saved = await saveBusinessPlan(taskId, {
          formData,
          sections: flushedSections,
          isCompleted,
          ...patch,
        })
        applyDocument(saved, { syncEditMode: false })
        lastSavedSnapshotRef.current = planDocumentSnapshot(saved)
        try {
          const files = await getEvaluationFiles(taskId)
          setDocumentFiles(files)
        } catch {
          /* hwpx 파일 목록 갱신 실패는 저장 자체와 무관 */
        }
        return saved
      } catch (error) {
        console.error("사업계획서 저장 실패:", error)
        toast({
          title: "저장에 실패했습니다.",
          variant: "destructive",
        })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [taskId, formData, sections, isCompleted, applyDocument, toast],
  )

  const load = useCallback(async () => {
    if (!taskId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [document, files, togetherFiles, projects] = await Promise.all([
        getBusinessPlan(taskId),
        getEvaluationFiles(taskId),
        getViewTogetherFixedFiles(),
        getProjects(getCurrentYearString()),
      ])
      const managerLabel = resolveTaskManagerLabel(taskId, projects)
      const mergedForm = await syncPlanFormFromPerformance(
        taskId,
        document.formData,
        managerLabel,
      )
      applyDocument(
        {
          ...document,
          formData: mergedForm,
        },
        { syncEditMode: true },
      )
      setDocumentFiles(files)
      const planFixedFiles = [PLAN_LIVE_REFERENCE_FILE, ...togetherFiles]
      setFixedFiles(planFixedFiles)
      const merged = mergeTaskReferenceDocuments(planFixedFiles, files)
      setSelectedFileId((prev) =>
        merged.some((file) => file.id === prev)
          ? prev
          : defaultSelectedDocumentId(merged, { preferPlanLive: true }),
      )
    } catch (error) {
      console.error("사업계획서 로드 실패:", error)
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }, [taskId, applyDocument])

  useEffect(() => {
    setHasLoadedOnce(false)
    sectionsStructureRef.current = null
    setFormData(emptyBusinessPlanFormData())
    setSections([])
    setIsCompleted(false)
    setIsEditMode(true)
    lastSavedSnapshotRef.current = ""
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  const sectionsStructureSignature = sections
    .map((section) => `${section.id}:${section.type}`)
    .join("\u0000")

  useEffect(() => {
    if (!hasLoadedOnce || !taskId || !canEditPlan) return
    if (sectionsStructureRef.current === sectionsStructureSignature) return

    const hadBaseline = sectionsStructureRef.current !== null
    sectionsStructureRef.current = sectionsStructureSignature
    if (hadBaseline) {
      lastLocalEditRef.current = Date.now()
      void persist()
    }
  }, [
    sectionsStructureSignature,
    hasLoadedOnce,
    taskId,
    canEditPlan,
    persist,
  ])

  useEffect(() => {
    if (!taskId || !hasLoadedOnce || !canEditPlan) return

    const snapshot = planDocumentSnapshot({ formData, sections, isCompleted })
    if (snapshot === lastSavedSnapshotRef.current) return

    if (Date.now() - lastLocalEditRef.current > 1600) {
      lastSavedSnapshotRef.current = snapshot
      return
    }

    const timer = window.setTimeout(() => {
      void persist()
    }, PLAN_AUTO_SAVE_MS)

    return () => window.clearTimeout(timer)
  }, [taskId, hasLoadedOnce, canEditPlan, formData, sections, isCompleted, persist])

  const handleCompleteOrEdit = async () => {
    if (isCompleted) {
      setIsEditMode(true)
      const saved = await persist({ isCompleted: false })
      if (!saved) {
        setIsEditMode(false)
      }
      return
    }

    const saved = await persist({ isCompleted: true })
    if (!saved) return

    setIsEditMode(false)
    toast({
      title: "사업계획서를 완료했습니다.",
    })
  }

  if (isLoading && !hasLoadedOnce) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        사업계획서를 불러오는 중입니다.
      </p>
    )
  }

  return (
    <div className="relative space-y-4">
      <CollaborationPresenceBar
        presence={presence}
        isConnected={isConnected}
        className="mb-2"
      />
      <CollaborationLiveNotice message={liveNotice} />
      {isLoading ? (
        <p className="print-hide absolute right-0 top-0 z-10 flex items-center gap-2 rounded-md border bg-card/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="size-3.5 animate-spin" />
          새로고침 중…
        </p>
      ) : null}

      <div className="evaluation-workspace-chrome print-hide flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {canEditPlan ? (
            <>
              {isSaving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  저장 중… (한글 양식 파일 동기화)
                </span>
              ) : (
                "수정 내용이 자동 저장되며, 한글(.hwpx) 파일이 함께 갱신됩니다."
              )}
            </>
          ) : (
            "보기 모드 · 「수정」을 누르면 다시 편집할 수 있습니다."
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <HwpxTemplateSelector
            kind="plan"
            selectedTemplateId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
            defaultLabel="기본 사업계획서 양식"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTemplatePreviewOpen(true)}
          >
            <Eye className="mr-1.5 size-4" />
            양식 미리보기
          </Button>
          <PrintDocumentButton />
          <HwpxDownloadButton
            onDownload={async () => {
              await downloadBusinessPlanHwpx(
                taskId,
                formData,
                sections,
                selectedTemplateId,
              )
            }}
          />
          <Button
            type="button"
            size="sm"
            className="min-w-[88px] bg-foreground text-background hover:bg-foreground/90"
            disabled={isSaving}
            onClick={() => void handleCompleteOrEdit()}
          >
            {isSaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {isCompleted ? "수정" : "완료"}
          </Button>
        </div>
      </div>

      <EvaluationSplitLayout
        defaultShowReferencePanel
        documentSelector={
          <TaskReferenceDocumentSelector
            fixedFiles={fixedFiles}
            taskFiles={documentFiles}
            selectedFileId={selectedFileId}
            onSelectFileId={setSelectedFileId}
          />
        }
        referencePanel={
          <TaskReferenceDocumentViewer
            taskId={taskId}
            selectedFileId={selectedFileId}
            fixedFiles={fixedFiles}
            taskFiles={documentFiles}
            planDocument={{
              formData,
              sections,
              isCompleted,
            }}
            planLoading={isLoading}
          />
        }
        editor={
          <div className="flex w-full min-w-0 flex-col space-y-4 pb-6">
            <PrintDocumentShell className="mx-auto w-full max-w-none">
              <BusinessPlanEditor
                formData={formData}
                sections={sections}
                taskId={taskId}
                readOnly={!canEditPlan}
                onFormDataChange={(next) => {
                  lastLocalEditRef.current = Date.now()
                  setFormData(next)
                }}
                onSectionsChange={(next) => {
                  lastLocalEditRef.current = Date.now()
                  setSections(next)
                }}
              />
            </PrintDocumentShell>
            <EvaluationFormActionBar
              canEdit={canEditPlan}
              isSaving={isSaving}
              showLoadPrevious={false}
              onHwpxDownload={async () => {
                await downloadBusinessPlanHwpx(
                  taskId,
                  formData,
                  sections,
                  selectedTemplateId,
                )
              }}
              hint={
                canEditPlan
                  ? isSaving
                    ? "자동 저장 중…"
                    : "요약 표·본문은 수정 즉시 자동 저장됩니다. 한글 파일은 저장 시 템플릿에 반영됩니다."
                  : "보기 모드 · 「수정」을 누르면 편집할 수 있습니다."
              }
              onSave={() => void persist()}
              onClose={() => {
                router.push(`/kanban/task/${taskId}/performance`)
              }}
              className="sticky bottom-4 z-20"
            />
          </div>
        }
      />

      <HwpxPreviewDialog
        open={templatePreviewOpen}
        onOpenChange={setTemplatePreviewOpen}
        title="사업계획서 양식 미리보기"
        description={
          selectedTemplateId
            ? "선택한 업로드 양식에 현재 내용을 채운 결과입니다."
            : "기본 양식에 현재 내용을 채운 결과입니다."
        }
        fetchHtml={() =>
          fetchBusinessPlanHwpxPreviewHtml(taskId, {
            formData,
            sections,
            templateId: selectedTemplateId,
          })
        }
      />
    </div>
  )
}

export default BusinessPlanTab
