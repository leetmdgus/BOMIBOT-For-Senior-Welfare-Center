import { PerformanceLayoutClient } from "@/components/kanban/task-detail/performance/performance-layout-client"

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PerformanceLayoutClient>{children}</PerformanceLayoutClient>
}