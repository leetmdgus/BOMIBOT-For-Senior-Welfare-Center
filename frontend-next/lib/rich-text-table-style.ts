import {
  buildTableGridMap,
  findTableWithCellSelection,
  normalizeCellRange,
  type CellRange,
} from "@/lib/rich-text-table-grid"
import type { RichTextTableContext } from "@/lib/rich-text-table-utils"

export type TableBorderLineStyle =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "none"

export type TableBorderStyle = {
  style: TableBorderLineStyle
  widthPx: number
  color: string
}

export const TABLE_BORDER_WIDTHS_PX = [1, 2, 3, 4] as const

export const TABLE_CELL_FILL_PALETTE = [
  "#FFFFFF",
  "#F3F4F6",
  "#E5E7EB",
  "#D1D5DB",
  "#FEF3C7",
  "#FDE68A",
  "#FECACA",
  "#BBDEFB",
  "#C8E6C9",
  "#E1BEE7",
  "#FFF9C4",
  "#FFCCBC",
  "#B2DFDB",
  "#CFD8DC",
  "#000000",
] as const

export const TABLE_BORDER_STYLE_OPTIONS: {
  value: TableBorderLineStyle
  label: string
}[] = [
  { value: "solid", label: "실선" },
  { value: "dashed", label: "파선" },
  { value: "dotted", label: "점선" },
  { value: "double", label: "이중선" },
  { value: "none", label: "없음" },
]

export function getCellsInRange(
  table: HTMLTableElement,
  range: CellRange,
): HTMLTableCellElement[] {
  const map = buildTableGridMap(table)
  const norm = normalizeCellRange(range)
  const seen = new Set<HTMLTableCellElement>()

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const cell = map.grid[r]?.[c]
      if (cell) seen.add(cell)
    }
  }

  return [...seen]
}

export function getTableStyleTargets(
  root: HTMLElement | null,
  ctx?: RichTextTableContext | null,
): { table: HTMLTableElement; cells: HTMLTableCellElement[] } | null {
  if (!root) return null

  const selectionHit = findTableWithCellSelection(root)
  if (selectionHit) {
    return {
      table: selectionHit.table,
      cells: getCellsInRange(selectionHit.table, selectionHit.range),
    }
  }

  if (ctx) {
    return { table: ctx.table, cells: [ctx.cell] }
  }

  return null
}

function borderCssValue(border: TableBorderStyle): string {
  if (border.style === "none") return "none"
  const width = border.style === "double" ? Math.max(3, border.widthPx) : border.widthPx
  return `${width}px ${border.style} ${border.color}`
}

export function applyTableCellsFill(
  cells: HTMLTableCellElement[],
  color: string | null,
): void {
  for (const cell of cells) {
    if (!color || color === "transparent") {
      cell.style.backgroundColor = ""
    } else {
      cell.style.backgroundColor = color
    }
  }
}

export function applyTableBorderStyle(
  table: HTMLTableElement,
  cells: HTMLTableCellElement[],
  border: TableBorderStyle,
): void {
  const value = borderCssValue(border)

  if (border.style === "none") {
    table.style.border = ""
    for (const cell of table.querySelectorAll("td, th")) {
      if (cell instanceof HTMLTableCellElement) {
        cell.style.border = ""
      }
    }
    return
  }

  table.style.border = value
  table.style.borderCollapse = "collapse"

  const targetSet = new Set(cells)
  if (targetSet.size === 0) {
    for (const cell of table.querySelectorAll("td, th")) {
      if (cell instanceof HTMLTableCellElement) {
        cell.style.border = value
      }
    }
    return
  }

  for (const cell of targetSet) {
    cell.style.border = value
  }
}

export function applyTableStyleFromEditor(
  root: HTMLElement | null,
  ctx: RichTextTableContext | null,
  action:
    | { type: "fill"; color: string | null }
    | { type: "border"; border: TableBorderStyle },
): boolean {
  const targets = getTableStyleTargets(root, ctx)
  if (!targets || targets.cells.length === 0) return false

  if (action.type === "fill") {
    applyTableCellsFill(targets.cells, action.color)
  } else {
    applyTableBorderStyle(targets.table, targets.cells, action.border)
  }

  return true
}

/** 표 전체에 동일 테두리 (선택 없을 때 표 안 커서 기준) */
export function applyWholeTableBorderStyle(
  table: HTMLTableElement,
  border: TableBorderStyle,
): void {
  const cells = Array.from(table.querySelectorAll("td, th")).filter(
    (el): el is HTMLTableCellElement => el instanceof HTMLTableCellElement,
  )
  applyTableBorderStyle(table, cells, border)
}

export function getTableStyleTargetCount(
  root: HTMLElement | null,
  ctx?: RichTextTableContext | null,
): number {
  return getTableStyleTargets(root, ctx)?.cells.length ?? 0
}
