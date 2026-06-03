"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Download, ExternalLink, Loader2 } from "lucide-react"
import QRCode from "react-qr-code"

import { PrintArea } from "@/components/common/print-area"
import { Sidebar } from "@/components/common/sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getClientSession } from "@/lib/auth/session"
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
  const [qrOpen, setQrOpen] = useState(false)

  const linkedTaskId = searchParams.get("taskId") ?? undefined

  const kanbanTaskId = linkedTaskId ?? detail?.taskId
  const listHref = kanbanTaskId
    ? `/kanban/task/${kanbanTaskId}/survey`
    : "/kanban"

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
        const data = await getSurveyDetail(id, { taskId: linkedTaskId })
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
  }, [id, linkedTaskId])

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

    if (id === "new" && nextDetail.id && nextDetail.id !== "new") {
      const params = new URLSearchParams(searchParams.toString())
      if (linkedTaskId ?? nextDetail.taskId) {
        params.set("taskId", linkedTaskId ?? nextDetail.taskId ?? "")
      }
      if (viewMode === "edit") {
        params.set("view", "edit")
      }
      router.replace(`/survey/${nextDetail.id}?${params.toString()}`)
    }
  }

  const surveyIdForLinks = detail?.id && detail.id !== "new" ? detail.id : id

  // QR/응답 링크에 지역을 포함해야 비로그인(QR) 응답자가 지역 없이도 설문을 불러올 수 있음
  const regionId = getClientSession()?.regionId ?? undefined
  const respondUrl =
    typeof window !== "undefined" && surveyIdForLinks !== "new"
      ? `${window.location.origin}/survey/${surveyIdForLinks}/respond${
          regionId ? `?region=${encodeURIComponent(regionId)}` : ""
        }`
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
    if (!respondUrl) {
      alert("응답 링크를 생성할 수 없습니다. 설문을 먼저 저장(게시)해 주세요.")
      return
    }
    setQrOpen(true)
  }

  const handleDownloadQrPng = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg")
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`
    const img = new Image()
    img.onload = () => {
      const size = 1024
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `survey-${surveyIdForLinks}-qr.png`
      link.click()
    }
    img.src = svg64
  }, [surveyIdForLinks])

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
        <SurveyTabNavigation id={kanbanTaskId ?? id} />

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
              {viewMode === "results" && (
                <SurveyResults
                  surveyId={detail.id}
                  surveyTitle={detail.basicInfo.title}
                />
              )}
              {viewMode === "edit" && (
                <SurveyEditor
                  ref={editorRef}
                  id={id}
                  taskId={linkedTaskId ?? detail.taskId}
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

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>설문 응답 QR</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-1">
            <div ref={qrRef} className="rounded-lg bg-white p-4 shadow-sm">
              {respondUrl ? <QRCode value={respondUrl} size={232} /> : null}
            </div>
            <p className="w-full break-all text-center text-xs text-muted-foreground">
              {respondUrl}
            </p>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleDownloadQrPng}
                disabled={!respondUrl}
              >
                <Download className="mr-2 size-4" />
                PNG 저장
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!respondUrl}
                onClick={() =>
                  respondUrl &&
                  window.open(respondUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="mr-2 size-4" />
                응답 화면 열기
              </Button>
            </div>
            {!regionId ? (
              <p className="text-center text-[11px] text-amber-600">
                지역 정보가 없어 QR에 지역이 포함되지 않았습니다. 로그인 후 다시 시도하면 비로그인 QR 응답이 됩니다.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
