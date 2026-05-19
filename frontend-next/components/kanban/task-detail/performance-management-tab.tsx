"use client"

import dynamic from "next/dynamic"

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
  return <PerformanceTable />
}