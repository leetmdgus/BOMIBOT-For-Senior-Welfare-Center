"use client"

import { cn } from "@/lib/utils"
import {
  usePerformance,
  type PerformanceView,
} from "./performance-provider"

const tabs: { label: string; view: PerformanceView }[] = [
  { label: "계획/실적 입력관리", view: "input" },
  { label: "사업계획", view: "plan" },
  { label: "사업실적", view: "actual" },
  { label: "사업결과", view: "result" },
]

export function PerformanceTabs() {
  const { activeView, setActiveView } = usePerformance()

  return (
    <div className="print-hide flex border-b border-border">
      {tabs.map((tab) => {
        const active = activeView === tab.view

        return (
          <button
            key={tab.view}
            type="button"
            onClick={() => setActiveView(tab.view)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
