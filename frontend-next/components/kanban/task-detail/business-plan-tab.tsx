"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { CollaborationLiveNotice } from "@/components/collaboration/collaboration-live-notice"
import { CollaborationPresenceBar } from "@/components/collaboration/collaboration-presence-bar"
import { HwpxDownloadButton } from "@/components/common/hwpx-download-button"
import {
  PrintDocumentButton,
  PrintDocumentShell,
} from "@/components/common/print-document"
import { downloadBusinessPlanHwpx } from "@/lib/hwpx/export-business-plan"
import { getBusinessPlan, saveBusinessPlan } from "@/services/kanban.task-detail.service"
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

export function BusinessPlanTab() {
  const params = useParams()
  const taskId = typeof params.id === "string" ? params.id : ""
  const { toast } = useToast()
  const { session } = useAuth()
  const lastLocalEditRef = useRef(0)
  const collaborationClientIdRef = useRef<string | null>(null)
  const [liveNotice, setLiveNotice] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [sections, setSections] = useState<BusinessPlanSection[]>([])
  const [formData, setFormData] = useState<BusinessPlanFormData>(emptyBusinessPlanFormData)

  const readOnly = isCompleted || previewMode

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
        if (payload.sections) setSections(payload.sections)
        if (payload.isCompleted !== undefined) {
          setIsCompleted(Boolean(payload.isCompleted))
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
    if (!readOnly && isConnected) {
      setFocus("editing")
      return () => setFocus(null)
    }
    setFocus(null)
    return undefined
  }, [readOnly, isConnected, setFocus])

  useDebouncedCollaborationDraft(
    publish,
    { formData, sections, isCompleted },
    { enabled: !readOnly, isConnected },
  )

  const load = useCallback(async () => {
    if (!taskId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const document = await getBusinessPlan(taskId)
      applyDocument(document)
    } catch (error) {
      console.error("사업계획서 로드 실패:", error)
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }, [taskId])

  useEffect(() => {
    setHasLoadedOnce(false)
    setFormData(emptyBusinessPlanFormData())
    setSections([])
    setIsCompleted(false)
    setPreviewMode(false)
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  const applyDocument = (document: BusinessPlanDocument) => {
    setFormData(document.formData)
    setSections(document.sections)
    setIsCompleted(Boolean(document.isCompleted))
    setPreviewMode(Boolean(document.isCompleted))
  }

  const persist = async (
    patch: Partial<BusinessPlanDocument> = {},
  ): Promise<BusinessPlanDocument | null> => {
    if (!taskId) return null

    setIsSaving(true)
    try {
      const saved = await saveBusinessPlan(taskId, {
        formData,
        sections,
        isCompleted,
        ...patch,
      })
      applyDocument(saved)
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
  }

  const handleCompleteToggle = async () => {
    const nextCompleted = !isCompleted
    const saved = await persist({ isCompleted: nextCompleted })
    if (!saved) return

    setPreviewMode(nextCompleted)
    toast({
      title: nextCompleted ? "사업계획서를 완료했습니다." : "수정 모드로 전환했습니다.",
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

  const markLocalEdit = () => {
    lastLocalEditRef.current = Date.now()
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
      <div className="print-hide flex flex-wrap items-center justify-end gap-2">
        <PrintDocumentButton />
        <HwpxDownloadButton
          onDownload={async () => {
            await downloadBusinessPlanHwpx(formData, sections)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSaving || readOnly}
          onClick={() => void persist()}
        >
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          저장
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() => void handleCompleteToggle()}
        >
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {isCompleted ? "수정" : "완료"}
        </Button>
      </div>

      <PrintDocumentShell className="mx-auto w-full max-w-none">
        <BusinessPlanEditor
          formData={formData}
          sections={sections}
          readOnly={readOnly}
          onFormDataChange={(next) => {
            markLocalEdit()
            setFormData(next)
          }}
          onSectionsChange={(next) => {
            markLocalEdit()
            setSections(next)
          }}
          previewMode={previewMode}
          onPreview={() => setPreviewMode((prev) => !prev)}
        />
      </PrintDocumentShell>
    </div>
  )
}

export default BusinessPlanTab
