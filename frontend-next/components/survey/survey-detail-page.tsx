"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import QRCode from "react-qr-code"

import { PrintArea } from "@/components/common/print-area"
import { Sidebar } from "@/components/common/sidebar"
import { getSurveyDetail } from "@/services/survey.service"
import type { SurveyDetail } from "@/services/survey.types"
import { SurveyBreadcrumb } from "./survey-breadcrumb"
import { SurveyTabNavigation } from "./survey-tab-navigation"
import { SurveyToolbar } from "./survey-toolbar"
import { SurveyPreview } from "./survey-preview"
import { SurveyResults } from "./survey-results"
import { SurveyEditor, type SurveyEditorHandle } from "./survey-editor"

export type ViewMode = "preview" | "results" | "edit"

export function SurveyDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editorRef = useRef<SurveyEditorHandle>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  const [viewMode, setViewMode] = useState<ViewMode>("preview")
  const [detail, setDetail] = useState<SurveyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const taskId = detail?.taskId ?? id
  const listHref = `/kanban/task/${taskId}/survey`

  useEffect(() => {
    const view = searchParams.get("view")

    if (view === "preview" || view === "results" || view === "edit") {
      setViewMode(view)
    } else if (id === "new") {
      setViewMode("edit")
    }
  }, [searchParams, id])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)

      try {
        const data = await getSurveyDetail(id)
        if (!cancelled) setDetail(data)
      } catch (error) {
        console.error("설문 로드 실패:", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [id])

  const handleViewChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode)
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", mode)
      router.replace(`/survey/${id}?${params.toString()}`, { scroll: false })
    },
    [id, router, searchParams]
  )

  const handleSaved = (nextDetail: SurveyDetail) => {
    setDetail(nextDetail)
    setLastSavedAt(new Date().toLocaleTimeString("ko-KR"))
  }

  const respondUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/survey/${id}/respond`
      : ""

  const handleCopyRespondLink = async () => {
    if (!respondUrl) return

    try {
      await navigator.clipboard.writeText(respondUrl)
      alert("응답 링크가 복사되었습니다.")
    } catch {
      alert("복사에 실패했습니다.")
    }
  }

  const handleQr = () => {
    if (respondUrl) {
      window.open(respondUrl, "_blank", "noopener,noreferrer")
      return
    }

    alert("응답 링크를 생성할 수 없습니다.")
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyResults = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/survey/${id}?view=results`
      )
      alert("결과 페이지 링크가 복사되었습니다.")
    } catch {
      alert("복사에 실패했습니다.")
    }
  }

  const handleDelete = () => {
    if (confirm("이 설문을 삭제하시겠습니까?")) {
      router.push(listHref)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main ref={setScrollRoot} className="flex-1 overflow-auto">
        <SurveyBreadcrumb />
        <SurveyTabNavigation id={taskId} />

        <div className="bg-muted/30 p-6 print:bg-white print:p-0">
          <SurveyToolbar
            title={detail?.basicInfo.title || "만족도조사"}
            listHref={listHref}
            viewMode={viewMode}
            onViewChange={handleViewChange}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            onSaveDraft={() => editorRef.current?.saveDraft()}
            onSavePublish={() => editorRef.current?.savePublish()}
            onCopyResults={handleCopyResults}
            onCopyRespondLink={handleCopyRespondLink}
            onPrint={handlePrint}
            onQr={handleQr}
            onDelete={handleDelete}
          />

          <PrintArea>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm">설문을 불러오는 중입니다.</p>
            </div>
          ) : !detail ? (
            <p className="py-24 text-center text-sm text-muted-foreground">
              설문을 찾을 수 없습니다.
            </p>
          ) : (
            <>
              {viewMode === "preview" && <SurveyPreview detail={detail} />}
              {viewMode === "results" && <SurveyResults surveyId={detail.id} />}
              {viewMode === "edit" && (
                <SurveyEditor
                  ref={editorRef}
                  id={id}
                  initialDetail={detail}
                  scrollRoot={scrollRoot}
                  onSaved={handleSaved}
                  onSavingChange={setIsSaving}
                />
              )}
            </>
          )}
          </PrintArea>
        </div>
      </main>

      <div className="hidden" aria-hidden>
        <div ref={qrRef} className="bg-white p-4">
          {respondUrl ? <QRCode value={respondUrl} size={256} /> : null}
        </div>
      </div>
    </div>
  )
}
