import type { PerformanceRow } from "@/services/kanban.performance.types"

export type RowClipboardEntry = Omit<PerformanceRow, "id" | "selected">

export function cloneRowForClipboard(row: PerformanceRow): RowClipboardEntry {
  const { id: _id, selected: _selected, ...rest } = row
  return {
    ...rest,
    fundingSources: rest.fundingSources
      ? [...rest.fundingSources]
      : undefined,
    planFunding: rest.planFunding
      ? rest.planFunding.map((entry) => ({ ...entry }))
      : undefined,
    actualFunding: rest.actualFunding
      ? rest.actualFunding.map((entry) => ({ ...entry }))
      : undefined,
  }
}

export function rowFromClipboardEntry(
  template: RowClipboardEntry,
  createId: () => string,
): PerformanceRow {
  return {
    id: createId(),
    selected: false,
    subProject: template.subProject,
    detailCategory: template.detailCategory,
    month: template.month,
    planPeople: template.planPeople,
    planCount: template.planCount,
    planBudget: template.planBudget,
    actualPeople: template.actualPeople,
    actualCount: template.actualCount,
    actualExpense: template.actualExpense,
    content: template.content,
    fundingSources: template.fundingSources
      ? [...template.fundingSources]
      : undefined,
    planFunding: template.planFunding
      ? template.planFunding.map((entry) => ({ ...entry }))
      : undefined,
    actualFunding: template.actualFunding
      ? template.actualFunding.map((entry) => ({ ...entry }))
      : undefined,
  }
}

export function rowsToTsv(rows: PerformanceRow[]) {
  const header = [
    "세부사업명",
    "상세분류",
    "월",
    "계획인원",
    "계획횟수",
    "계획예산",
    "실적인원",
    "실적횟수",
    "실적지출",
    "내용",
  ]

  const lines = rows.map((row) =>
    [
      row.subProject,
      row.detailCategory,
      row.month,
      row.planPeople,
      row.planCount,
      row.planBudget,
      row.actualPeople,
      row.actualCount,
      row.actualExpense,
      row.content,
    ].join("\t"),
  )

  return [header.join("\t"), ...lines].join("\n")
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='combobox']",
    ),
  )
}
