import { hwpAstId } from "@/lib/hwp-ast/ids"
import { normalizeTableGrid } from "@/lib/hwp-ast/normalizeTableGrid"
import type {
  HwpBlock,
  HwpParagraphBlock,
  HwpTable,
  HwpTableCell,
  HwpTableRow,
} from "@/lib/hwp-ast/types"
import { HWP_TABLE_WIDTH_HWPUNIT } from "@/lib/hwp-ast/types"
import { sanitizeHwpxText } from "@/lib/hwpx/hwpx-encoding"

function cellText(el: Element): string {
  return sanitizeHwpxText((el.textContent ?? "").replace(/\s+/g, " ").trim() || " ")
}

function parseFontSizePx(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = /^([\d.]+)\s*px$/i.exec(raw.trim())
  if (!m) return null
  const px = Math.round(Number(m[1]))
  return Number.isFinite(px) && px > 0 ? px : null
}

/** 셀의 대표 글자 크기(px) — 셀 자체 또는 첫 번째 명시 스팬 기준 */
function cellFontSizePx(cellEl: HTMLTableCellElement): number | null {
  const own =
    parseFontSizePx(cellEl.getAttribute("data-bp-fz")) ??
    parseFontSizePx(cellEl.style.fontSize)
  if (own) return own

  const marked = cellEl.querySelector<HTMLElement>("[data-bp-fz]")
  if (marked) {
    const fromAttr = parseFontSizePx(marked.getAttribute("data-bp-fz"))
    if (fromAttr) return fromAttr
  }

  const styled = cellEl.querySelector<HTMLElement>('[style*="font-size"]')
  if (styled) {
    const fromStyle = parseFontSizePx(styled.style.fontSize)
    if (fromStyle) return fromStyle
  }

  return null
}

function parseCssLength(raw: string | null | undefined): number | null {
  if (!raw) return null
  const px = raw.match(/^([\d.]+)px$/i)
  if (px) return Math.round(Number(px[1]))
  const pct = raw.match(/^([\d.]+)%$/i)
  if (pct) {
    return Math.round((HWP_TABLE_WIDTH_HWPUNIT * Number(pct[1])) / 100)
  }
  return null
}

function extractColumnWidths(tableEl: HTMLTableElement, colCount: number): number[] {
  const fromColgroup: number[] = []
  const colgroup = tableEl.querySelector("colgroup")
  if (colgroup) {
    for (const col of Array.from(colgroup.querySelectorAll("col"))) {
      const w =
        parseCssLength(col.getAttribute("data-col-width")) ??
        parseCssLength(col.style.width) ??
        parseCssLength(col.getAttribute("width"))
      fromColgroup.push(w ?? 0)
    }
  }

  if (fromColgroup.length >= colCount && fromColgroup.every((w) => w > 0)) {
    return fromColgroup.slice(0, colCount)
  }

  const total = HWP_TABLE_WIDTH_HWPUNIT
  const base = Math.floor(total / colCount)
  return Array.from({ length: colCount }, (_, i) =>
    i === colCount - 1 ? total - base * (colCount - 1) : base,
  )
}

function htmlCellToAst(cellEl: HTMLTableCellElement): HwpTableCell {
  const bg =
    cellEl.getAttribute("data-bg") ??
    cellEl.style.backgroundColor ??
    null

  const verticalAlign =
    (cellEl.style.verticalAlign as "top" | "middle" | "bottom" | "") || "top"

  return {
    type: "tableCell",
    id: cellEl.getAttribute("data-ast-id") ?? hwpAstId("tc"),
    rowSpan: cellEl.rowSpan || 1,
    colSpan: cellEl.colSpan || 1,
    grid: { row: 0, col: 0 },
    style: {
      backgroundColor: bg,
      verticalAlign: verticalAlign || "top",
      header: cellEl.tagName === "TH",
      fontSizePx: cellFontSizePx(cellEl),
    },
    content: cellText(cellEl)
      ? [{ type: "paragraph", content: [{ type: "text", text: cellText(cellEl) }] }]
      : [],
    hwp: {},
  }
}

export function htmlTableToAst(tableEl: HTMLTableElement): HwpTable {
  const rows: HwpTableRow[] = []

  for (let r = 0; r < tableEl.rows.length; r++) {
    const tr = tableEl.rows[r]
    const cells: HwpTableCell[] = []
    for (let c = 0; c < tr.cells.length; c++) {
      cells.push(htmlCellToAst(tr.cells[c]))
    }
    if (cells.length > 0) {
      rows.push({
        type: "tableRow",
        id: tr.getAttribute("data-ast-id") ?? hwpAstId("tr"),
        cells,
      })
    }
  }

  const colCount = Math.max(
    1,
    ...rows.map((row) => row.cells.reduce((sum, cell) => sum + cell.colSpan, 0)),
  )

  return normalizeTableGrid({
    type: "table",
    id: tableEl.getAttribute("data-ast-id") ?? hwpAstId("tbl"),
    columns: extractColumnWidths(tableEl, colCount).map((width) => ({ width })),
    rows: rows.length > 0 ? rows : [{
      type: "tableRow",
      id: hwpAstId("tr"),
      cells: [{
        type: "tableCell",
        id: hwpAstId("tc"),
        rowSpan: 1,
        colSpan: 1,
        grid: { row: 0, col: 0 },
        style: { verticalAlign: "top" },
        content: [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
      }],
    }],
    hwp: {},
  })
}

export type HtmlHwpxBlocks = {
  paragraphs: Array<{ text: string; variant?: "title" | "heading" | "body" }>
  tables: HwpTable[]
}

function pushParagraph(
  blocks: HtmlHwpxBlocks,
  text: string,
  variant?: "title" | "heading" | "body",
) {
  const t = text.trim()
  if (t) blocks.paragraphs.push({ text: t, variant })
}

/** 리치텍스트 HTML → 문단 + 표 AST */
export function htmlToHwpBlocks(html: string): HtmlHwpxBlocks {
  const blocks: HtmlHwpxBlocks = { paragraphs: [], tables: [] }
  if (!html?.trim()) return blocks

  if (typeof document === "undefined") {
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
        blocks.tables.push(htmlTableToAst(el as HTMLTableElement))
        continue
      }
      if (tag === "h1" || tag === "h2" || el.classList.contains("doc-chapter")) {
        pushParagraph(blocks, cellText(el), "heading")
        continue
      }
      if (
        tag === "h3" ||
        tag === "h4" ||
        el.classList.contains("doc-section") ||
        el.classList.contains("doc-section-plain")
      ) {
        pushParagraph(blocks, cellText(el), "heading")
        continue
      }
      if (tag === "p" || tag === "li") {
        pushParagraph(blocks, cellText(el), "body")
        continue
      }
      if (tag === "img") {
        const alt = sanitizeHwpxText(el.getAttribute("alt") || "") || "[이미지]"
        pushParagraph(blocks, alt, "body")
        continue
      }
      if (tag === "br") continue
      if (["div", "ul", "ol", "tbody", "thead"].includes(tag)) {
        walk(el)
        continue
      }
      pushParagraph(blocks, cellText(el), "body")
    }
  }

  walk(root)
  return blocks
}

export function paragraphTextFromBlocks(blocks: HwpBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type !== "paragraph") continue
    for (const run of block.content) {
      if (run.type === "text" && run.text.trim()) {
        parts.push(run.text.trim())
      }
    }
  }
  return parts.join(" ")
}
