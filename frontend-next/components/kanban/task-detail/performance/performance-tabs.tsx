"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "계획/실적 입력관리", href: "input" },
  { label: "사업계획", href: "plan" },
  { label: "사업실적", href: "actual" },
  { label: "사업결과", href: "result" },
]

export function PerformanceTabs() {
  const pathname = usePathname()
  const params = useParams()
  const taskId = params.id

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => {
        const href = `/kanban/task/${taskId}/performance/${tab.href}`
        const active = pathname === href

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
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
  )
}