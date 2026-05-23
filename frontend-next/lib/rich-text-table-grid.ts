export type CellRange = {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export type TableGridMap = {
  table: HTMLTableElement
  rows: number
  cols: number
  grid: HTMLTableCellElement[][]
  bounds: Map<
    HTMLTableCellElement,
    { minR: number; maxR: number; minC: number; maxC: number }
  >
}

export function normalizeCellRange(range: CellRange): CellRange {
  return {
    startRow: Math.min(range.startRow, range.endRow),
    startCol: Math.min(range.startCol, range.endCol),
    endRow: Math.max(range.startRow, range.endRow),
    endCol: Math.max(range.startCol, range.endCol),
  }
}

export function buildTableGridMap(table: HTMLTableElement): TableGridMap {
  const rowCount = table.rows.length
  const grid: HTMLTableCellElement[][] = []
  const occupied: boolean[][] = []
  const bounds = new Map<
    HTMLTableCellElement,
    { minR: number; maxR: number; minC: number; maxC: number }
  >()
  let colCount = 0

  for (let r = 0; r < rowCount; r++) {
    const row = table.rows[r]
    if (!grid[r]) grid[r] = []
    if (!occupied[r]) occupied[r] = []

    let col = 0
    for (const cell of Array.from(row.cells)) {
      while (occupied[r][col]) col++

      const colspan = cell.colSpan || 1
      const rowspan = cell.rowSpan || 1
      const cellBounds = {
        minR: r,
        maxR: r + rowspan - 1,
        minC: col,
        maxC: col + colspan - 1,
      }
      bounds.set(cell, cellBounds)

      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          const rr = r + dr
          const cc = col + dc
          if (!grid[rr]) grid[rr] = []
          if (!occupied[rr]) occupied[rr] = []
          grid[rr][cc] = cell
          occupied[rr][cc] = true
          colCount = Math.max(colCount, cc + 1)
        }
      }
      col += colspan
    }
  }

  return { table, rows: rowCount, cols: colCount, grid, bounds }
}

export function getCellBounds(
  table: HTMLTableElement,
  cell: HTMLTableCellElement,
) {
  return buildTableGridMap(table).bounds.get(cell) ?? null
}

const selectionStore = new WeakMap<HTMLTableElement, CellRange>()

function clearTableCellSelectionVisual(table: HTMLTableElement) {
  table.querySelectorAll(".bp-rt-cell-selected").forEach((el) => {
    el.classList.remove("bp-rt-cell-selected")
  })
}

function applyTableCellSelectionVisual(
  table: HTMLTableElement,
  range: CellRange,
) {
  const map = buildTableGridMap(table)
  const norm = normalizeCellRange(range)
  const seen = new Set<HTMLTableCellElement>()

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const cell = map.grid[r]?.[c]
      if (cell && !seen.has(cell)) {
        seen.add(cell)
        cell.classList.add("bp-rt-cell-selected")
      }
    }
  }
}

export function setTableCellSelection(
  table: HTMLTableElement,
  range: CellRange | null,
) {
  clearTableCellSelectionVisual(table)
  if (!range) {
    selectionStore.delete(table)
    return
  }
  const norm = normalizeCellRange(range)
  selectionStore.set(table, norm)
  applyTableCellSelectionVisual(table, norm)
  table.dispatchEvent(
    new CustomEvent("bp-rt-table-selection-change", { bubbles: true }),
  )
}

export function getTableCellSelection(
  table: HTMLTableElement,
): CellRange | null {
  return selectionStore.get(table) ?? null
}

export function clearTableCellSelection(table: HTMLTableElement) {
  const had = selectionStore.has(table)
  setTableCellSelection(table, null)
  if (had) {
    table.dispatchEvent(
      new CustomEvent("bp-rt-table-selection-change", { bubbles: true }),
    )
  }
}

/** 표 구조 재정비 후에도 WeakMap 선택·하이라이트 유지 */
export function refreshAllTableCellSelectionVisuals(root: HTMLElement): void {
  root.querySelectorAll("table").forEach((table) => {
    if (!(table instanceof HTMLTableElement)) return
    const range = getTableCellSelection(table)
    if (!range) return
    clearTableCellSelectionVisual(table)
    applyTableCellSelectionVisual(table, range)
  })
}

export function findTableWithCellSelection(
  root: HTMLElement | null,
): { table: HTMLTableElement; range: CellRange } | null {
  if (!root) return null
  for (const table of root.querySelectorAll("table")) {
    if (!(table instanceof HTMLTableElement)) continue
    const range = getTableCellSelection(table)
    if (range) return { table, range }
  }
  return null
}

export function isMultiCellSelection(range: CellRange): boolean {
  const norm = normalizeCellRange(range)
  if (norm.endRow !== norm.startRow || norm.endCol !== norm.startCol) {
    return true
  }
  return false
}

export function canMergeTableCellRange(
  table: HTMLTableElement,
  range: CellRange,
): boolean {
  const norm = normalizeCellRange(range)
  const map = buildTableGridMap(table)
  const anchors = new Set<HTMLTableCellElement>()

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const cell = map.grid[r]?.[c]
      if (!cell) return false
      anchors.add(cell)
    }
  }

  if (anchors.size === 0) return false

  if (anchors.size === 1) {
    const only = [...anchors][0]!
    const b = map.bounds.get(only)!
    const singleLogical =
      norm.endRow - norm.startRow === 0 && norm.endCol - norm.startCol === 0
    if (
      singleLogical &&
      b.maxR - b.minR === 0 &&
      b.maxC - b.minC === 0
    ) {
      return false
    }
  }

  for (const cell of anchors) {
    const b = map.bounds.get(cell)!
    if (
      b.minR < norm.startRow ||
      b.maxR > norm.endRow ||
      b.minC < norm.startCol ||
      b.maxC > norm.endCol
    ) {
      return false
    }
  }

  return true
}

export function collectCellsInRange(
  table: HTMLTableElement,
  range: CellRange,
): {
  norm: CellRange
  anchors: Set<HTMLTableCellElement>
  topLeft: HTMLTableCellElement
} | null {
  if (!canMergeTableCellRange(table, range)) return null

  const norm = normalizeCellRange(range)
  const map = buildTableGridMap(table)
  const anchors = new Set<HTMLTableCellElement>()

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      anchors.add(map.grid[r]![c]!)
    }
  }

  const topLeft = map.grid[norm.startRow]![norm.startCol]!
  return { norm, anchors, topLeft }
}
