import { getMonthlyPlanMock } from "@/lib/mocks/kanban.monthly-plan.mock"
import {
  getMockInputRowsForTask,
  saveMockInputRowsForTask,
} from "@/lib/mocks/kanban.performance-by-task.mock"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import { requireTaskId } from "@/lib/kanban/require-task-id"
import type { RegionId } from "@/lib/auth/regions"
import type {
  MonthlyPlanResponse,
  MonthlyPlanVersion,
  PerformanceInputMeta,
  PerformanceListResponse,
  PerformanceRow,
} from "./kanban.performance.types"

function mapSubProjectToRow(
  item: {
    id?: string
    name: string
    category: string
    month: string
    planPeople: number
    planCount: number
    planBudget: number
    actualPeople: number
    actualCount: number
    projectId?: string
  },
  index: number,
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

export async function getInputManagementRows(
  taskId: string,
  regionId?: RegionId,
): Promise<PerformanceRow[]> {
  const tid = requireTaskId(taskId)
  const store = await loadRegionStore({ regionId })
  const legacy = store.performanceInput.inputManagementRows
  return getMockInputRowsForTask(tid, legacy)
}

export async function getPerformanceInputMeta(
  regionId?: RegionId,
): Promise<PerformanceInputMeta> {
  const store = await loadRegionStore({ regionId })

  return {
    subProjectChips: structuredClone(
      store.performanceInput.performanceSubProjectChips,
    ),
    detailCategories: [...store.performanceInput.defaultDetailCategories],
  }
}

export async function getMonthlyPlan(
  version: MonthlyPlanVersion = "기본계획",
  _regionId?: RegionId,
): Promise<MonthlyPlanResponse> {
  return getMonthlyPlanMock(version)
}

export async function saveInputManagementRows(
  rows: PerformanceRow[],
  taskId: string,
): Promise<{ success: boolean; count: number }> {
  saveMockInputRowsForTask(requireTaskId(taskId), rows)
  return { success: true, count: rows.length }
}

export async function saveMonthlyPlan(
  version: MonthlyPlanVersion = "기본계획",
): Promise<MonthlyPlanResponse> {
  return getMonthlyPlanMock(version)
}

export async function getPerformanceRows(
  params?: {
    projectId?: string
    month?: string
  },
  regionId?: RegionId,
): Promise<PerformanceListResponse> {
  const store = await loadRegionStore({ regionId })

  let filtered = store.kanban.subProjects

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
