import type { HwpTable } from "@/lib/hwp-ast/types"

export function normalizeTableGrid(table: HwpTable): HwpTable {
  const occupied = new Set<string>()

  const rows = table.rows.map((row, rowIndex) => {
    let colIndex = 0

    const cells = row.cells.map((cell) => {
      while (occupied.has(`${rowIndex}:${colIndex}`)) {
        colIndex += 1
      }

      const nextCell = {
        ...cell,
        grid: { row: rowIndex, col: colIndex },
      }

      for (let r = 0; r < nextCell.rowSpan; r++) {
        for (let c = 0; c < nextCell.colSpan; c++) {
          occupied.add(`${rowIndex + r}:${colIndex + c}`)
        }
      }

      colIndex += nextCell.colSpan
      return nextCell
    })

    return { ...row, cells }
  })

  return { ...table, rows }
}

export function getCellWidth(
  table: HwpTable,
  cellCol: number,
  colSpan: number,
): number {
  return table.columns
    .slice(cellCol, cellCol + colSpan)
    .reduce((sum, col) => sum + col.width, 0)
}

export function neededColumnCount(table: HwpTable): number {
  let max = 1
  for (const row of table.rows) {
    const span = row.cells.reduce((sum, cell) => sum + cell.colSpan, 0)
    max = Math.max(max, span)
  }
  return Math.max(max, table.columns.length)
}
