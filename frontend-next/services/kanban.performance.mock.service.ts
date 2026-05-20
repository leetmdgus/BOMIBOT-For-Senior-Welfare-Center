import { subProjects } from "@/lib/mocks/kanban.board.mock"
import { getMonthlyPlanMock } from "@/lib/mocks/kanban.monthly-plan.mock"
import {
  defaultDetailCategories,
  inputManagementRows,
  performanceSubProjectChips,
} from "@/lib/mocks/kanban.performance-input.mock"
import type {
  MonthlyPlanResponse,
  MonthlyPlanVersion,
  PerformanceInputMeta,
  PerformanceListResponse,
  PerformanceRow,
} from "./kanban.performance.types"

function mapSubProjectToRow(
  item: (typeof subProjects)[number],
  index: number
): PerformanceRow {
  return {
    id: item.id ?? String(index + 1),
    selected: false,
    subProject: item.name,
    detailCategory: item.category,
    month: item.month,
    planPeople: item.planPeople,
    planCount: item.planCount,
    planBudget: item.planBudget,
    actualPeople: item.actualPeople,
    actualCount: item.actualCount,
    actualExpense: 0,
    content: item.name,
  }
}

export async function getInputManagementRows(): Promise<PerformanceRow[]> {
  return inputManagementRows
}

export async function getPerformanceInputMeta(): Promise<PerformanceInputMeta> {
  return {
    subProjectChips: structuredClone(performanceSubProjectChips),
    detailCategories: [...defaultDetailCategories],
  }
}

export async function getMonthlyPlan(
  version: MonthlyPlanVersion = "기본계획"
): Promise<MonthlyPlanResponse> {
  return getMonthlyPlanMock(version)
}

export async function getPerformanceRows(params?: {
  projectId?: string
  month?: string
}): Promise<PerformanceListResponse> {
  let filtered = subProjects

  if (params?.projectId) {
    filtered = filtered.filter((item) => item.projectId === params.projectId)
  }

  if (params?.month) {
    filtered = filtered.filter((item) => item.month === params.month)
  }

  const data = filtered.map(mapSubProjectToRow)

  return {
    data,
    totals: {
      planPeople: filtered.reduce((acc, item) => acc + item.planPeople, 0),
      planCount: filtered.reduce((acc, item) => acc + item.planCount, 0),
      planBudget: filtered.reduce((acc, item) => acc + item.planBudget, 0),
      actualPeople: filtered.reduce((acc, item) => acc + item.actualPeople, 0),
      actualCount: filtered.reduce((acc, item) => acc + item.actualCount, 0),
    },
    count: data.length,
  }
}
