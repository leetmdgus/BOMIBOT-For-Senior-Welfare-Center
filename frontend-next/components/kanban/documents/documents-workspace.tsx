"use client"

import { useDocuments } from "./documents-provider"
import { PerformanceReportTable } from "./performance-report-table"
import { BudgetReportTable } from "./budget-report-table"
import { BusinessPlanContent } from "./business-plan-content"

export function DocumentsWorkspace() {
  const { activeView } = useDocuments()

  switch (activeView) {
    case "budget":
      return (
        <div className="kanban-documents-report-view kanban-documents-report-view--budget">
          <BudgetReportTable />
        </div>
      )
    case "business-plan":
      return (
        <div className="kanban-documents-report-view kanban-documents-report-view--business-plan">
          <BusinessPlanContent />
        </div>
      )
    case "performance":
    default:
      return (
        <div className="kanban-documents-report-view kanban-documents-report-view--performance">
          <PerformanceReportTable />
        </div>
      )
  }
}
