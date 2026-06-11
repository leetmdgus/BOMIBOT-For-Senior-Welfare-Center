"use client"

import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { surveySectionId } from "@public/survey/hooks/use-survey-section-scroll"
import type { SurveySettings } from "@/services/survey.types"

export type SurveySidebarTab = "outline" | "style" | "settings"

export interface SurveyOutlineItem {
  id: string
  label: string
  type: string
}

interface SurveyOutlineSidebarProps {
  selectedTab: SurveySidebarTab
  onChange: (tab: SurveySidebarTab) => void
  basicInfoTitle: string
  sections: SurveyOutlineItem[]
  activeSectionId?: string
  onNavigate?: (sectionId: string) => void
  pageCount?: number
  settings: SurveySettings
  onSettingsChange: (settings: SurveySettings) => void
}

export function SurveyOutlineSidebar({
  selectedTab,
  onChange,
  basicInfoTitle,
  sections,
  activeSectionId,
  onNavigate,
  pageCount = 1,
  settings,
  onSettingsChange,
}: SurveyOutlineSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)
  const coverSectionId = surveySectionId("basic")

  useEffect(() => {
    if (!activeSectionId || selectedTab !== "outline") return

    activeItemRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [activeSectionId, selectedTab])

  return (
    <aside className="hidden w-72 shrink-0 self-start lg:block">
      <div className="sticky top-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4 border-b border-border px-4 pb-3 pt-4">
          <OutlineTab
            active={selectedTab === "outline"}
            onClick={() => onChange("outline")}
          >
            개요
          </OutlineTab>
          <OutlineTab
            active={selectedTab === "style"}
            onClick={() => onChange("style")}
          >
            스타일
          </OutlineTab>
          <OutlineTab
            active={selectedTab === "settings"}
            onClick={() => onChange("settings")}
          >
            설정
          </OutlineTab>
        </div>

        <div
          ref={listRef}
          className="max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain p-4"
          onWheel={(event) => event.stopPropagation()}
        >
          {selectedTab === "outline" && (
            <div className="space-y-1">
              <button
                ref={
                  activeSectionId === coverSectionId ? activeItemRef : undefined
                }
                type="button"
                onClick={() => onNavigate?.(coverSectionId)}
                className={cn(
                  "w-full rounded-lg border-2 p-3 text-left transition-colors",
                  activeSectionId === coverSectionId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <p className="text-xs font-medium text-primary">
                  1/{pageCount} 표지
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {basicInfoTitle || "설문 제목"}
                </p>
              </button>

              <div className="space-y-0.5 pl-1">
                {sections.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    질문을 추가하면 목차에 표시됩니다.
                  </p>
                ) : (
                  sections.map((section) => {
                    const isActive = activeSectionId === section.id

                    return (
                      <button
                        key={section.id}
                        ref={isActive ? activeItemRef : undefined}
                        type="button"
                        onClick={() => onNavigate?.(section.id)}
                        className={cn(
                          "group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className="line-clamp-2 flex-1">{section.label}</span>
                      </button>
                    )
                  })
                )}
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                항목을 클릭하면 해당 위치로 이동합니다.
              </p>
            </div>
          )}

          {selectedTab === "style" && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>표지 색상·글꼴 등 응답 화면 스타일을 설정할 수 있습니다.</p>
              <p className="text-xs">
                기본 테마는 BOMIBOT 브랜드 색(Primary)을 따릅니다.
              </p>
              <Button variant="outline" size="sm" type="button" disabled>
                스타일 편집 (준비 중)
              </Button>
            </div>
          )}

          {selectedTab === "settings" && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground">응답 수집</span>
                <Switch
                  checked={settings.acceptResponses}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, acceptResponses: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">중복 응답 허용</span>
                <Switch
                  checked={settings.allowDuplicate}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, allowDuplicate: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">진행률 표시</span>
                <Switch
                  checked={settings.showProgress}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, showProgress: checked })
                  }
                />
              </div>

              {!settings.acceptResponses ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
                  응답 수집이 <strong>중지</strong>되었습니다. 저장(게시) 후
                  응답자에게 “현재 이 설문은 응답을 받지 않습니다”로 표시되고
                  제출이 차단됩니다.
                </p>
              ) : null}

              <p className="text-xs leading-relaxed text-muted-foreground">
                설문을 완전히 마감하려면 표지의 상태를 <strong>마감</strong>으로
                바꾸세요. 변경 사항은 저장해야 응답 화면에 반영됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function OutlineTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}
