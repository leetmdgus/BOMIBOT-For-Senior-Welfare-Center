import {
  buildTableGridMap,
  findTableWithCellSelection,
  normalizeCellRange,
  type CellRange,
  type TableGridMap,
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

  /*
   * 셀을 클릭한 뒤 툴바 팝오버를 누르면 본문 포커스(window 선택)가 풀려
   * ctx 가 null 이 될 수 있다. 이때도 마지막으로 편집/포커스된 셀
   * (.bp-rt-cell-editing)을 대상으로 삼아 "선택한 셀에 안 먹는" 현상을 막는다.
   */
  const editingCell = root.querySelector<HTMLTableCellElement>(
    "td.bp-rt-cell-editing, th.bp-rt-cell-editing",
  )
  if (editingCell) {
    const table = editingCell.closest("table")
    if (table instanceof HTMLTableElement && root.contains(table)) {
      return { table, cells: [editingCell] }
    }
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

const BORDER_EDGES = ["Top", "Right", "Bottom", "Left"] as const
type BorderEdge = (typeof BORDER_EDGES)[number]
const OPPOSITE_EDGE: Record<BorderEdge, BorderEdge> = {
  Top: "Bottom",
  Bottom: "Top",
  Left: "Right",
  Right: "Left",
}

function allTableCells(table: HTMLTableElement): HTMLTableCellElement[] {
  return Array.from(table.querySelectorAll("td, th")).filter(
    (el): el is HTMLTableCellElement => el instanceof HTMLTableCellElement,
  )
}

function setCellBorderEdge(
  cell: HTMLTableCellElement,
  edge: BorderEdge,
  value: string,
): void {
  switch (edge) {
    case "Top":
      cell.style.borderTop = value
      break
    case "Right":
      cell.style.borderRight = value
      break
    case "Bottom":
      cell.style.borderBottom = value
      break
    case "Left":
      cell.style.borderLeft = value
      break
  }
}

/** 표 격자에서 cell 의 특정 변에 맞닿은 (인접) 셀들 */
function neighborCellsAcrossEdge(
  map: TableGridMap,
  bounds: { minR: number; maxR: number; minC: number; maxC: number },
  edge: BorderEdge,
): HTMLTableCellElement[] {
  const out: HTMLTableCellElement[] = []
  const push = (r: number, c: number) => {
    const cell = map.grid[r]?.[c]
    if (cell) out.push(cell)
  }
  if (edge === "Top") {
    const r = bounds.minR - 1
    if (r >= 0) for (let c = bounds.minC; c <= bounds.maxC; c++) push(r, c)
  } else if (edge === "Bottom") {
    const r = bounds.maxR + 1
    for (let c = bounds.minC; c <= bounds.maxC; c++) push(r, c)
  } else if (edge === "Left") {
    const c = bounds.minC - 1
    if (c >= 0) for (let r = bounds.minR; r <= bounds.maxR; r++) push(r, c)
  } else {
    const c = bounds.maxC + 1
    for (let r = bounds.minR; r <= bounds.maxR; r++) push(r, c)
  }
  return out
}

/**
 * 주어진 셀들에만 테두리를 셀 단위로 적용한다. border-collapse 표에서는 변을
 * 공유하는 두 셀의 충돌 해석 때문에 같은 두께의 색·선 변경이나 "없음"이 화면에
 * 반영되지 않을 수 있어, 맞닿은 비선택 셀의 반대편 변도 같은 값으로 맞춰
 * 어느 쪽이 이기든 동일하게 그려지도록 한다.
 */
function applyBordersToCellSet(
  table: HTMLTableElement,
  cells: HTMLTableCellElement[],
  border: TableBorderStyle,
): void {
  const value = borderCssValue(border)
  table.style.borderCollapse = "collapse"

  const map = buildTableGridMap(table)
  const targetSet = new Set(cells)

  for (const cell of targetSet) {
    const bounds = map.bounds.get(cell)
    if (!bounds) continue
    for (const edge of BORDER_EDGES) {
      setCellBorderEdge(cell, edge, value)
      for (const neighbor of neighborCellsAcrossEdge(map, bounds, edge)) {
        if (!targetSet.has(neighbor)) {
          setCellBorderEdge(neighbor, OPPOSITE_EDGE[edge], value)
        }
      }
    }
  }
}

/**
 * 선택 셀(없으면 표 전체 셀)에 셀 단위 테두리 적용.
 * 표 바깥 프레임(table.style.border)은 건드리지 않아, 한 셀만 바꿔도
 * 표 전체에 테두리가 둘리는 일이 없다.
 */
export function applyTableBorderStyle(
  table: HTMLTableElement,
  cells: HTMLTableCellElement[],
  border: TableBorderStyle,
): void {
  const targetCells = cells.length > 0 ? cells : allTableCells(table)
  applyBordersToCellSet(table, targetCells, border)
}

export type TableStyleTargets = {
  table: HTMLTableElement
  cells: HTMLTableCellElement[]
}

export type TableStyleAction =
  | { type: "fill"; color: string | null }
  | { type: "border"; border: TableBorderStyle }

/** 이미 확보한 대상(table+cells)에 서식 적용. 표/셀이 분리됐으면 무시. */
export function applyTableStyleToTargets(
  targets: TableStyleTargets | null,
  action: TableStyleAction,
): boolean {
  if (!targets) return false
  const cells = targets.cells.filter((cell) => targets.table.contains(cell))
  if (cells.length === 0) return false

  if (action.type === "fill") {
    applyTableCellsFill(cells, action.color)
  } else {
    applyTableBorderStyle(targets.table, cells, action.border)
  }
  return true
}

export function applyTableStyleFromEditor(
  root: HTMLElement | null,
  ctx: RichTextTableContext | null,
  action: TableStyleAction,
): boolean {
  return applyTableStyleToTargets(getTableStyleTargets(root, ctx), action)
}

/** 표 전체에 동일 테두리 (선택 없을 때 표 안 커서 기준) — 바깥 프레임도 함께 */
export function applyWholeTableBorderStyle(
  table: HTMLTableElement,
  border: TableBorderStyle,
): void {
  table.style.borderCollapse = "collapse"
  table.style.border = border.style === "none" ? "" : borderCssValue(border)
  applyBordersToCellSet(table, allTableCells(table), border)
}

export function getTableStyleTargetCount(
  root: HTMLElement | null,
  ctx?: RichTextTableContext | null,
): number {
  return getTableStyleTargets(root, ctx)?.cells.length ?? 0
}
