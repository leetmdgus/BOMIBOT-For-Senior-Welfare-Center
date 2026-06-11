"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { SurveyActionMenu } from "./survey-action-menu"
import type { ViewMode } from "./survey-detail-page"

interface SurveyToolbarProps {
  title?: string
  listHref: string
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
  isSaving?: boolean
  lastSavedAt?: string | null
  onSaveDraft?: () => void
  onSavePublish?: () => void
  onCopyResults?: () => void
  onCopyRespondLink?: () => void
  onPrint?: () => void
  onQr?: () => void
  onDelete?: () => void
}

export function SurveyToolbar({
  title = "만족도조사",
  listHref,
  viewMode,
  onViewChange,
  isSaving,
  lastSavedAt,
  onSaveDraft,
  onSavePublish,
  onCopyResults,
  onCopyRespondLink,
  onPrint,
  onQr,
  onDelete,
}: SurveyToolbarProps) {
  return (
    <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {viewMode === "edit" && lastSavedAt ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            마지막 저장 {lastSavedAt}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {viewMode === "edit" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={onSaveDraft}
            >
              임시저장
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={onSavePublish}
            >
              {isSaving ? "저장 중..." : "저장하기"}
            </Button>
          </>
        ) : null}

        <Button variant="outline" size="sm" asChild>
          <Link href={listHref}>목록</Link>
        </Button>

        <SurveyActionMenu
          viewMode={viewMode}
          onViewChange={onViewChange}
          onCopyResults={onCopyResults}
          onCopyRespondLink={onCopyRespondLink}
          onPrint={onPrint}
          onQr={onQr}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
