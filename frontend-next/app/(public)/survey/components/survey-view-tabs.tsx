import { cn } from "@/lib/utils"
import type { ViewMode } from "./survey-detail-page"

interface SurveyViewTabsProps {
  viewMode: ViewMode
  onChange: (viewMode: ViewMode) => void
}

export function SurveyViewTabs({ viewMode, onChange }: SurveyViewTabsProps) {
  const tabs: { label: string; value: ViewMode }[] = [
    { label: "미리보기", value: "preview" },
    { label: "결과보기", value: "results" },
    { label: "편집", value: "edit" },
  ]

  return (
    <div className="mb-6 flex items-center gap-4">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            viewMode === tab.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}