import type { JSONContent } from "@tiptap/core"

import { normalizeTableGrid } from "@/lib/hwp-ast/normalizeTableGrid"
import type {
  HwpBlock,
  HwpParagraphBlock,
  HwpTable,
  HwpTableCell,
  HwpTableRow,
  HwpTextRun,
} from "@/lib/hwp-ast/types"

function tipTapTextRun(node: JSONContent): HwpTextRun {
  const text = String(node.attrs?.text ?? " ").trim() || " "
  return { type: "text", text }
}

function tipTapParagraph(node: JSONContent): HwpParagraphBlock {
  const runs = (node.content ?? [])
    .filter((child) => child.type === "hwpTextRun")
    .map(tipTapTextRun)

  return {
    type: "paragraph",
    content: runs.length > 0 ? runs : [{ type: "text", text: " " }],
  }
}

function tipTapCell(node: JSONContent): HwpTableCell {
  const blocks: HwpBlock[] = (node.content ?? [])
    .map(tipTapBlockToHwp)
    .filter((block): block is HwpBlock => block !== null)

  return {
    type: "tableCell",
    id: String(node.attrs?.id ?? ""),
    rowSpan: Number(node.attrs?.rowSpan ?? 1),
    colSpan: Number(node.attrs?.colSpan ?? 1),
    grid: {
      row: Number(node.attrs?.gridRow ?? 0),
      col: Number(node.attrs?.gridCol ?? 0),
    },
    style: {
      backgroundColor: (node.attrs?.backgroundColor as string | null) ?? null,
      verticalAlign:
        (node.attrs?.verticalAlign as "top" | "middle" | "bottom") ?? "top",
      header: Boolean(node.attrs?.header),
    },
    content:
      blocks.length > 0
        ? blocks
        : [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
    hwp: (node.attrs?.hwp as Record<string, unknown> | null) ?? undefined,
  }
}

function tipTapRow(node: JSONContent): HwpTableRow {
  return {
    type: "tableRow",
    id: String(node.attrs?.id ?? ""),
    cells: (node.content ?? [])
      .filter((child) => child.type === "hwpTableCell")
      .map(tipTapCell),
  }
}

function tipTapTable(node: JSONContent): HwpTable {
  const columnsRaw = node.attrs?.columns
  const columns = Array.isArray(columnsRaw)
    ? columnsRaw.map((col) => ({
        width: Number((col as { width?: number }).width ?? 0),
      }))
    : []

  const table: HwpTable = {
    type: "table",
    id: String(node.attrs?.id ?? ""),
    columns,
    rows: (node.content ?? [])
      .filter((child) => child.type === "hwpTableRow")
      .map(tipTapRow),
    hwp: (node.attrs?.hwp as Record<string, unknown> | null) ?? undefined,
  }

  return normalizeTableGrid(table)
}

/** TipTap JSONContent 노드 → AST HwpBlock (미지원 노드는 null) */
export function tipTapBlockToHwp(node: JSONContent): HwpBlock | null {
  switch (node.type) {
    case "hwpParagraph":
      return tipTapParagraph(node)
    case "hwpTable":
      return tipTapTable(node)
    default:
      return null
  }
}

/** TipTap doc JSON → AST HwpBlock[] */
export function tipTapDocToHwpBlocks(doc: JSONContent): HwpBlock[] {
  if (doc.type !== "doc") {
    throw new Error(`Expected doc root, got ${String(doc.type)}`)
  }

  return (doc.content ?? [])
    .map(tipTapBlockToHwp)
    .filter((block): block is HwpBlock => block !== null)
}
