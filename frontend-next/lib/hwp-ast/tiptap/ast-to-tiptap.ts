import type { JSONContent } from "@tiptap/core"

import type {
  HwpBlock,
  HwpParagraphBlock,
  HwpTable,
  HwpTableCell,
  HwpTableRow,
  HwpTextRun,
} from "@/lib/hwp-ast/types"

function textRunToTipTap(run: HwpTextRun): JSONContent {
  return {
    type: "hwpTextRun",
    attrs: { text: run.text || " " },
  }
}

function paragraphToTipTap(block: HwpParagraphBlock): JSONContent {
  const runs = block.content.length
    ? block.content
    : [{ type: "text" as const, text: " " }]
  return {
    type: "hwpParagraph",
    content: runs.map(textRunToTipTap),
  }
}

function cellToTipTap(cell: HwpTableCell): JSONContent {
  const content =
    cell.content.length > 0
      ? cell.content.map(hwpBlockToTipTap)
      : [paragraphToTipTap({ type: "paragraph", content: [{ type: "text", text: " " }] })]

  return {
    type: "hwpTableCell",
    attrs: {
      id: cell.id,
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
      gridRow: cell.grid.row,
      gridCol: cell.grid.col,
      backgroundColor: cell.style.backgroundColor ?? null,
      verticalAlign: cell.style.verticalAlign ?? "top",
      header: cell.style.header ?? false,
      hwp: cell.hwp ?? null,
    },
    content,
  }
}

function rowToTipTap(row: HwpTableRow): JSONContent {
  return {
    type: "hwpTableRow",
    attrs: { id: row.id },
    content: row.cells.map(cellToTipTap),
  }
}

function tableToTipTap(table: HwpTable): JSONContent {
  return {
    type: "hwpTable",
    attrs: {
      id: table.id,
      columns: table.columns.map((col) => ({ width: col.width })),
      hwp: table.hwp ?? null,
    },
    content: table.rows.map(rowToTipTap),
  }
}

/** AST HwpBlock → TipTap JSONContent 노드 */
export function hwpBlockToTipTap(block: HwpBlock): JSONContent {
  if (block.type === "paragraph") return paragraphToTipTap(block)
  return tableToTipTap(block)
}

/** AST HwpBlock[] → TipTap doc JSON */
export function hwpBlocksToTipTapDoc(blocks: HwpBlock[]): JSONContent {
  const content =
    blocks.length > 0
      ? blocks.map(hwpBlockToTipTap)
      : [paragraphToTipTap({ type: "paragraph", content: [{ type: "text", text: " " }] })]

  return { type: "doc", content }
}

/** 단일 표 AST → TipTap doc (셀 편집용) */
export function hwpTableToTipTapDoc(table: HwpTable): JSONContent {
  return hwpBlocksToTipTapDoc([table])
}
