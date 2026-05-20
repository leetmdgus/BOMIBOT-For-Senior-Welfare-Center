import { statsData, progressData } from "@/lib/mocks/dashboard.mock"
import { booksData, categories } from "@/lib/mocks/ebooks.mock"
import { inputManagementRows } from "@/lib/mocks/kanban.performance-input.mock"
import { projectsMock } from "@/lib/mocks/kanban.board.mock"
import { departmentsData } from "@/lib/mocks/organization.mock"
import { surveyListItemsMock } from "@/lib/mocks/survey.mock"
import type { PerformanceRow } from "@/services/kanban.performance.types"

import type { AssistantDataSnapshot, MetricTotals } from "./assistant-types"

const MONTHS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
]

function emptyTotals(): MetricTotals {
  return {
    planPeople: 0,
    planCount: 0,
    planBudget: 0,
    actualPeople: 0,
    actualCount: 0,
    actualExpense: 0,
  }
}

function addTotals(base: MetricTotals, row: PerformanceRow): MetricTotals {
  return {
    planPeople: base.planPeople + row.planPeople,
    planCount: base.planCount + row.planCount,
    planBudget: base.planBudget + row.planBudget,
    actualPeople: base.actualPeople + row.actualPeople,
    actualCount: base.actualCount + row.actualCount,
    actualExpense: base.actualExpense + row.actualExpense,
  }
}

function isCountableRow(row: PerformanceRow) {
  return Boolean(row.subProject) && row.subProject !== "선택"
}

function buildPerformanceSnapshot(rows: PerformanceRow[]) {
  const countable = rows.filter(isCountableRow)
  const byMonth: Record<string, MetricTotals> = Object.fromEntries(
    MONTHS.map((month) => [month, emptyTotals()]),
  )
  const bySubProject: Record<string, MetricTotals> = {}

  let totals = emptyTotals()

  for (const row of countable) {
    totals = addTotals(totals, row)

    if (byMonth[row.month]) {
      byMonth[row.month] = addTotals(byMonth[row.month], row)
    }

    if (!bySubProject[row.subProject]) {
      bySubProject[row.subProject] = emptyTotals()
    }
    bySubProject[row.subProject] = addTotals(bySubProject[row.subProject], row)
  }

  return {
    rowCount: countable.length,
    totals,
    byMonth,
    bySubProject,
    subProjects: Object.keys(bySubProject).sort((a, b) => a.localeCompare(b, "ko")),
  }
}

function countKanbanTasks() {
  const tasksByStatus: Record<string, number> = {}
  let taskCount = 0

  for (const project of projectsMock) {
    for (const category of project.categories) {
      const label = category.title
      tasksByStatus[label] = (tasksByStatus[label] ?? 0) + category.tasks.length
      taskCount += category.tasks.length
    }
  }

  return {
    projectCount: projectsMock.length,
    taskCount,
    tasksByStatus,
  }
}

function countEmployees() {
  const departments = departmentsData.filter((item) => item.id !== "all")
  const employeeCount = departments.reduce(
    (sum, dept) => sum + dept.employees.length,
    0,
  )

  return {
    employeeCount,
    departmentCount: departments.length,
  }
}

export function buildAssistantDataSnapshot(): AssistantDataSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    dashboard: {
      stats: statsData.map((item) => ({
        label: item.label,
        value: item.value,
        unit: item.unit,
        description: item.description,
      })),
      progress: progressData.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    },
    performance: buildPerformanceSnapshot(inputManagementRows),
    kanban: countKanbanTasks(),
    organization: countEmployees(),
    ebooks: {
      bookCount: booksData.length,
      categories: [...categories],
    },
    surveys: {
      totalCount: surveyListItemsMock.length,
      titles: surveyListItemsMock.map((item) => item.title),
    },
  }
}
