"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Sidebar } from "@/components/common/sidebar"
import { SurveyBreadcrumb } from "./survey-breadcrumb"
import { SurveyTabNavigation } from "./survey-tab-navigation"
import { SurveyHeader } from "./survey-header"
import { SurveyViewTabs } from "./survey-view-tabs"
import { SurveyPreview } from "./survey-preview"
import { SurveyResults } from "./survey-results"
import { SurveyEditor } from "./survey-editor"

export type ViewMode = "preview" | "results" | "edit"

export function SurveyDetailPage({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>("preview")

  useEffect(() => {
    const view = searchParams.get("view")

    if (view === "preview" || view === "results" || view === "edit") {
      setViewMode(view)
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <SurveyBreadcrumb />
        <SurveyTabNavigation id={id} />

        <div className="p-6">
          <SurveyHeader id={id} />

          <SurveyViewTabs viewMode={viewMode} onChange={setViewMode} />

          {viewMode === "preview" && <SurveyPreview />}
          {viewMode === "results" && <SurveyResults />}
          {viewMode === "edit" && <SurveyEditor id={id} />}
        </div>
      </main>
    </div>
  )
}