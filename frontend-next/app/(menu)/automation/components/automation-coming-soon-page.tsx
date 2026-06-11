"use client"

import { Sparkles, Zap } from "lucide-react"

import { Sidebar } from "@common/layouts/sidebar"
import { Header } from "@common/layouts/header"
import { Badge } from "@/components/ui/badge"
import { TemplateWorkspace } from "@menu/kanban/components/task-detail/template-doc/template-workspace"

export function AutomationComingSoonPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <Header />

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Zap className="size-5" />
                <span className="text-sm font-medium">문서자동화</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                양식 업로드 · 빈칸 채우기
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                한글 양식(.hwpx)을 업로드해 빈 칸을 채우고 다시 내려받을 수 있습니다.
                증빙문서 자동분석 등 나머지 자동화 기능은 준비 중입니다.
              </p>
            </div>

            <Badge variant="secondary" className="gap-1.5 whitespace-nowrap">
              <Sparkles className="size-3.5" />
              자동분석 Coming Soon
            </Badge>
          </div>

          {/* 툴바(양식 업로드 · 이전 양식 불러오기 · HWPX 내려받기) + 편집기 — 유지 */}
          <TemplateWorkspace />
        </div>
      </main>
    </div>
  )
}
