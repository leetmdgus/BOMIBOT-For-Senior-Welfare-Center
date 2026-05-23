import { stripHtml, type HwpxParagraph, type HwpxTable, type HwpxTableCell } from "@/lib/hwpx/hwpx-builder"

export type HtmlHwpxBlocks = {
  paragraphs: HwpxParagraph[]
  tables: HwpxTable[]
}

function cellText(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim() || " "
}

function htmlTableToHwpx(tableEl: HTMLTableElement): HwpxTable {
  const rows: HwpxTableCell[][] = []

  for (let r = 0; r < tableEl.rows.length; r++) {
    const tr = tableEl.rows[r]
    const row: HwpxTableCell[] = []
    for (let c = 0; c < tr.cells.length; c++) {
      const cellEl = tr.cells[c]
      const colSpan = cellEl.colSpan || 1
      const rowSpan = cellEl.rowSpan || 1
      row.push({
        text: cellText(cellEl),
        colSpan: colSpan > 1 ? colSpan : undefined,
        rowSpan: rowSpan > 1 ? rowSpan : undefined,
        header: cellEl.tagName === "TH",
      })
    }
    if (row.length > 0) rows.push(row)
  }

  const colCount = Math.max(
    ...rows.map((row) => row.reduce((s, cell) => s + (cell.colSpan ?? 1), 0)),
    1,
  )
  const total = 42520
  const base = Math.floor(total / colCount)

  return {
    rows: rows.length > 0 ? rows : [[{ text: " " }]],
    colWidths: Array.from({ length: colCount }, (_, i) =>
      i === colCount - 1 ? total - base * (colCount - 1) : base,
    ),
  }
}

function pushParagraph(blocks: HtmlHwpxBlocks, text: string, variant?: HwpxParagraph["variant"]) {
  const t = text.trim()
  if (!t) return
  blocks.paragraphs.push({ text: t, variant })
}

/** 리치텍스트 HTML → HWPX 문단·표 블록 */
export function htmlToHwpxBlocks(html: string): HtmlHwpxBlocks {
  const blocks: HtmlHwpxBlocks = { paragraphs: [], tables: [] }
  if (!html?.trim()) return blocks

  if (typeof document === "undefined") {
    const plain = stripHtml(html)
    if (plain) blocks.paragraphs.push({ text: plain, variant: "body" })
    return blocks
  }

  const root = document.createElement("div")
  root.innerHTML = html

  const walk = (parent: Element) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim()
        if (t) pushParagraph(blocks, t, "body")
        continue
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      if (tag === "table") {
        blocks.tables.push(htmlTableToHwpx(el as HTMLTableElement))
        continue
      }
      if (tag === "h1" || tag === "h2" || el.classList.contains("doc-chapter")) {
        pushParagraph(blocks, cellText(el), "heading")
        continue
      }
      if (tag === "h3" || tag === "h4" || el.classList.contains("doc-section") || el.classList.contains("doc-section-plain")) {
        pushParagraph(blocks, cellText(el), "heading")
        continue
      }
      if (tag === "p" || tag === "li") {
        pushParagraph(blocks, cellText(el), "body")
        continue
      }
      if (tag === "br") {
        continue
      }
      if (["div", "ul", "ol", "tbody", "thead"].includes(tag)) {
        walk(el)
        continue
      }
      pushParagraph(blocks, cellText(el), "body")
    }
  }

  walk(root)

  if (blocks.paragraphs.length === 0 && blocks.tables.length === 0) {
    const plain = stripHtml(html)
    if (plain) blocks.paragraphs.push({ text: plain, variant: "body" })
  }

  return blocks
}
