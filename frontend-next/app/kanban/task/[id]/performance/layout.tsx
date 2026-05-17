import { PerformanceProvider } from "@/components/kanban/task-detail/performance/performance-provider"
import { PerformanceTabs } from "@/components/kanban/task-detail/performance/performance-tabs"

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PerformanceProvider>
      <div className="flex flex-col gap-4">
        <PerformanceTabs />
        {children}
      </div>
    </PerformanceProvider>
  )
}