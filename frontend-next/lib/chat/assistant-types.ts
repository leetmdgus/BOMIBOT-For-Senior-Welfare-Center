export type MetricTotals = {
  planPeople: number
  planCount: number
  planBudget: number
  actualPeople: number
  actualCount: number
  actualExpense: number
}

export type AssistantDataSnapshot = {
  generatedAt: string
  dashboard: {
    stats: Array<{ label: string; value: string; unit: string; description: string }>
    progress: Array<{ label: string; value: number }>
  }
  performance: {
    rowCount: number
    totals: MetricTotals
    byMonth: Record<string, MetricTotals>
    bySubProject: Record<string, MetricTotals>
    subProjects: string[]
  }
  kanban: {
    projectCount: number
    taskCount: number
    tasksByStatus: Record<string, number>
  }
  organization: {
    employeeCount: number
    departmentCount: number
  }
  ebooks: {
    bookCount: number
    categories: string[]
  }
  surveys: {
    totalCount: number
    titles: string[]
  }
}

export type AssistantAnswerSource =
  | "aggregate"
  | "ontology"
  | "performance"
  | "dashboard"
  | "kanban"
  | "organization"
  | "ebooks"
  | "survey"
  | "help"

export type AssistantAnswer = {
  content: string
  sources: AssistantAnswerSource[]
}
