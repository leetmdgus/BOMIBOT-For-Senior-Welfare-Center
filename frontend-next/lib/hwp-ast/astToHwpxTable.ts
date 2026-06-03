import { paragraphTextFromBlocks } from "@/lib/hwp-ast/htmlTableToAst"
import { normalizeTableGrid } from "@/lib/hwp-ast/normalizeTableGrid"
import type { HwpTable } from "@/lib/hwp-ast/types"
import type { HwpxTable, HwpxTableCell } from "@/lib/hwpx/hwpx-builder"

/** 표 AST → 기존 hwpx-builder HwpxTable (다운로드 ZIP) */
export function astToHwpxTable(table: HwpTable): HwpxTable {
  const normalized = normalizeTableGrid(table)

  const rows: HwpxTableCell[][] = normalized.rows.map((row) =>
    row.cells.map((cell) => ({
      text: paragraphTextFromBlocks(cell.content) || " ",
      colSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
      rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
      header: cell.style.header,
      backgroundColor: cell.style.backgroundColor ?? undefined,
      fontSizePx: cell.style.fontSizePx ?? undefined,
    })),
  )

  return {
    rows: rows.length > 0 ? rows : [[{ text: " " }]],
    colWidths: normalized.columns.map((col) => col.width),
  }
}

export function hwpTablesToHwpx(tables: HwpTable[]): HwpxTable[] {
  return tables.map(astToHwpxTable)
}
