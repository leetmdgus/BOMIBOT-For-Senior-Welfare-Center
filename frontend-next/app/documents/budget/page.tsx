import { BudgetReportFilters } from "@/components/documents/budget-report-filters"
import { BudgetReportTable } from "@/components/documents/budget-report-table"

export default function BudgetPage() {
  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <BudgetReportFilters />
      </div>

      <BudgetReportTable />
    </>
  )
}