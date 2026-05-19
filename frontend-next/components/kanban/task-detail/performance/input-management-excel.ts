import type { PerformanceRow } from "@/services/kanban.performance.types"

export type InputGridColumnKey = keyof Pick<
  PerformanceRow,
  | "subProject"
  | "detailCategory"
  | "month"
  | "planPeople"
  | "planCount"
  | "planBudget"
  | "actualPeople"
  | "actualCount"
  | "actualExpense"
  | "content"
>

export type InputGridColumn = {
  key: InputGridColumnKey
  type: "text" | "number"
}

export const INPUT_GRID_COLUMNS: InputGridColumn[] = [
  { key: "subProject", type: "text" },
  { key: "detailCategory", type: "text" },
  { key: "month", type: "text" },
  { key: "planPeople", type: "number" },
  { key: "planCount", type: "number" },
  { key: "planBudget", type: "number" },
  { key: "actualPeople", type: "number" },
  { key: "actualCount", type: "number" },
  { key: "actualExpense", type: "number" },
  { key: "content", type: "text" },
]

export type CellPosition = {
  rowIndex: number
  colIndex: number
}

export type CellRange = {
  start: CellPosition
  end: CellPosition
}

export function normalizeRange(range: CellRange): CellRange {
  return {
    start: {
      rowIndex: Math.min(range.start.rowIndex, range.end.rowIndex),
      colIndex: Math.min(range.start.colIndex, range.end.colIndex),
    },
    end: {
      rowIndex: Math.max(range.start.rowIndex, range.end.rowIndex),
      colIndex: Math.max(range.start.colIndex, range.end.colIndex),
    },
  }
}

export function isCellInRange(
  rowIndex: number,
  colIndex: number,
  range: CellRange | null
) {
  if (!range) return false

  const normalized = normalizeRange(range)
  return (
    rowIndex >= normalized.start.rowIndex &&
    rowIndex <= normalized.end.rowIndex &&
    colIndex >= normalized.start.colIndex &&
    colIndex <= normalized.end.colIndex
  )
}

export function parseClipboardGrid(text: string): string[][] {
  return text
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
}

export function parseCellValue(
  column: InputGridColumn,
  raw: string
): string | number {
  if (column.type === "number") {
    const cleaned = raw.replaceAll(",", "").trim()
    if (!cleaned) return 0
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return raw.trim()
}

export function getCellDisplayValue(
  row: PerformanceRow,
  column: InputGridColumn
): string {
  const value = row[column.key]
  if (column.type === "number") {
    return String(value ?? 0)
  }
  return String(value ?? "")
}

export function applyGridToRows(
  rows: PerformanceRow[],
  start: CellPosition,
  grid: string[][]
): PerformanceRow[] {
  const next = rows.map((row) => ({ ...row }))

  grid.forEach((line, rowOffset) => {
    const targetRowIndex = start.rowIndex + rowOffset
    if (targetRowIndex < 0 || targetRowIndex >= next.length) return

    line.forEach((raw, colOffset) => {
      const targetColIndex = start.colIndex + colOffset
      const column = INPUT_GRID_COLUMNS[targetColIndex]
      if (!column) return

      next[targetRowIndex] = {
        ...next[targetRowIndex],
        [column.key]: parseCellValue(column, raw),
      }
    })
  })

  return next
}

export function fillRangeValues(
  rows: PerformanceRow[],
  source: CellPosition,
  target: CellRange
): PerformanceRow[] {
  const normalized = normalizeRange(target)
  const sourceColumn = INPUT_GRID_COLUMNS[source.colIndex]
  if (!sourceColumn) return rows

  const sourceRow = rows[source.rowIndex]
  if (!sourceRow) return rows

  const sourceValue = sourceRow[sourceColumn.key]
  const next = rows.map((row) => ({ ...row }))

  for (
    let rowIndex = normalized.start.rowIndex;
    rowIndex <= normalized.end.rowIndex;
    rowIndex += 1
  ) {
    for (
      let colIndex = normalized.start.colIndex;
      colIndex <= normalized.end.colIndex;
      colIndex += 1
    ) {
      const column = INPUT_GRID_COLUMNS[colIndex]
      if (!column || !next[rowIndex]) continue

      if (rowIndex === source.rowIndex && colIndex === source.colIndex) {
        continue
      }

      if (column.type === "number" && typeof sourceValue === "number") {
        next[rowIndex][column.key] = sourceValue as never
      } else {
        next[rowIndex][column.key] = sourceValue as never
      }
    }
  }

  return next
}

export function rangeToTsv(
  rows: PerformanceRow[],
  range: CellRange
): string {
  const normalized = normalizeRange(range)
  const lines: string[] = []

  for (
    let rowIndex = normalized.start.rowIndex;
    rowIndex <= normalized.end.rowIndex;
    rowIndex += 1
  ) {
    const cells: string[] = []

    for (
      let colIndex = normalized.start.colIndex;
      colIndex <= normalized.end.colIndex;
      colIndex += 1
    ) {
      const column = INPUT_GRID_COLUMNS[colIndex]
      const row = rows[rowIndex]
      if (!column || !row) {
        cells.push("")
        continue
      }

      cells.push(getCellDisplayValue(row, column))
    }

    lines.push(cells.join("\t"))
  }

  return lines.join("\n")
}
