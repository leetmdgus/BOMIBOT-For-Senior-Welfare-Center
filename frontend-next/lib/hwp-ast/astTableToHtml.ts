import { getCellWidth, normalizeTableGrid } from "@/lib/hwp-ast/normalizeTableGrid"
import { paragraphTextFromBlocks } from "@/lib/hwp-ast/htmlTableToAst"
import type { HwpBlock, HwpTable } from "@/lib/hwp-ast/types"
import { HWP_TABLE_WIDTH_HWPUNIT } from "@/lib/hwp-ast/types"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function blocksToHtml(blocks: HwpBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type === "table") {
      parts.push(astTableToHtml(block))
      continue
    }
    const text = paragraphTextFromBlocks([block])
    if (text) {
      parts.push(`<p>${escapeHtml(text)}</p>`)
    }
  }
  return parts.join("")
}

/** 표 AST → HTML (미리보기·에디터 동기화) */
export function astTableToHtml(table: HwpTable): string {
  const normalized = normalizeTableGrid(table)
  const colCount = normalized.columns.length || 1

  const colgroup = normalized.columns
    .map((col) => {
      const pct = Math.round((col.width / HWP_TABLE_WIDTH_HWPUNIT) * 1000) / 10
      return `<col data-col-width="${col.width}" style="width:${pct}%" />`
    })
    .join("")

  const rowsHtml = normalized.rows
    .map((row) => {
      const cellsHtml = row.cells
        .map((cell) => {
          const width = getCellWidth(normalized, cell.grid.col, cell.colSpan)
          const bg = cell.style.backgroundColor
            ? ` background-color:${cell.style.backgroundColor};`
            : ""
          const valign = cell.style.verticalAlign ?? "top"
          const tag = cell.style.header ? "th" : "td"
          const content = blocksToHtml(cell.content) || "&nbsp;"
          return (
            `<${tag} data-ast-id="${escapeHtml(cell.id)}"` +
            ` colspan="${cell.colSpan}" rowspan="${cell.rowSpan}"` +
            ` style="vertical-align:${valign};${bg}width:${Math.round((width / HWP_TABLE_WIDTH_HWPUNIT) * 100)}%">` +
            `${content}</${tag}>`
          )
        })
        .join("")
      return `<tr data-ast-id="${escapeHtml(row.id)}">${cellsHtml}</tr>`
    })
    .join("")

  return (
    `<table class="hwp-ast-table bp-rt-table" data-ast-id="${escapeHtml(normalized.id)}"` +
    ` style="width:100%;border-collapse:collapse;table-layout:fixed">` +
    `<colgroup>${colgroup || `<col span="${colCount}" />`}</colgroup>` +
    `<tbody>${rowsHtml}</tbody></table>`
  )
}
