"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const tabs = [
  {
    label: "실적관리",
    href: "performance",
  },
  {
    label: "사업계획",
    href: "business-plan",
  },
  {
    label: "만족도조사",
    href: "survey",
  },
  {
    label: "사업평가",
    href: "evaluation",
  },
]

export function TaskDetailTabs({
  taskId,
}: {
  taskId: string
}) {
  const pathname = usePathname()

  const activeTab =
    tabs.find((tab) => pathname === `/kanban/task/${taskId}/${tab.href}`) ??
    tabs[0]

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-card px-6">
      {/* 좌측 현재 탭명 */}
      <div className="text-sm font-semibold text-foreground">
        {activeTab.label}
      </div>

      {/* 우측 탭 */}
      <div className="flex h-full items-center gap-1">
        {tabs.map((tab) => {
          const href = `/kanban/task/${taskId}/${tab.href}`
          const active = pathname === href

          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "flex h-full items-center border-b-2 px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}