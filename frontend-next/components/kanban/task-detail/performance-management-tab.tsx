"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"

const PerformanceTable = dynamic(
  () =>
    import("@/components/kanban/performance/performance-table").then((mod) => ({
      default: mod.PerformanceTable,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    ),
  }
)

export function PerformanceManagementTab() {
  const params = useParams()
  const rawId = params.id
  const taskId = Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? ""

  if (!taskId) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        업무를 선택해 주세요.
      </div>
    )
  }

  return <PerformanceTable taskId={taskId} />
}