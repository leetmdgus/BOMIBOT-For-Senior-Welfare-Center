"use client"

import { useDocuments } from "./documents-provider"
import { PerformanceReportTable } from "./performance-report-table"
import { BudgetReportTable } from "./budget-report-table"
import { BusinessPlanContent } from "./business-plan-content"

export function DocumentsWorkspace() {
  const { activeView } = useDocuments()

  switch (activeView) {
    case "budget":
      return <BudgetReportTable />
    case "business-plan":
      return <BusinessPlanContent />
    case "performance":
    default:
      return <PerformanceReportTable />
  }
}
