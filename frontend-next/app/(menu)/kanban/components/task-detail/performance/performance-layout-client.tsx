"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"

import {
  getInputManagementRows,
  getPerformanceInputMeta,
} from "@/services/kanban.performance.service"

import { PerformanceProvider } from "./performance-provider"
import { PerformanceTabs } from "./performance-tabs"

export function PerformanceLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const rawId = params.id
  const taskId = Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? ""

  useEffect(() => {
    if (!taskId) return
    void Promise.all([
      getInputManagementRows(taskId),
      getPerformanceInputMeta(),
    ])
  }, [taskId])

  return (
    <PerformanceProvider key={taskId} taskId={taskId}>
      <div className="flex flex-col gap-4">
        <PerformanceTabs />
        {children}
      </div>
    </PerformanceProvider>
  )
}
