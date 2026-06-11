"use client"

import { usePerformance } from "./performance-provider"
import InputManagementTab from "./input-management-tab"
import MonthlyPlanView from "./MontlyPanView"
import { ActualTab } from "./actual-tab"
import { ResultTab } from "./result-tab"

export function PerformanceWorkspace() {
  const { activeView } = usePerformance()

  switch (activeView) {
    case "plan":
      return <MonthlyPlanView />
    case "actual":
      return <ActualTab />
    case "result":
      return <ResultTab />
    case "input":
    default:
      return <InputManagementTab />
  }
}
