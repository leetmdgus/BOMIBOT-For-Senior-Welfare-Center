import { PerformanceReportFilters } from "@/components/kanban/documents/performance-report-filters";
import { PerformanceReportTable } from "@/components/kanban/documents/performance-report-table";

export default function PerformancePage() {
  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <PerformanceReportFilters />
      </div>

      <PerformanceReportTable />
    </>
  )
}