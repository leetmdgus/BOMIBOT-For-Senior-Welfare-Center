import {
  astToHwpxTable,
  htmlToHwpBlocks,
  type HtmlHwpxBlocks,
} from "@/lib/hwp-ast"
import { stripHtml, type HwpxParagraph, type HwpxTable } from "@/lib/hwpx/hwpx-builder"

export type { HtmlHwpxBlocks }

/** 리치텍스트 HTML → HWPX 문단·표 (AST 경유) */
export function htmlToHwpxBlocks(html: string): {
  paragraphs: HwpxParagraph[]
  tables: HwpxTable[]
} {
  if (!html?.trim()) {
    return { paragraphs: [], tables: [] }
  }

  if (typeof document === "undefined") {
    const plain = stripHtml(html)
    return plain
      ? { paragraphs: [{ text: plain, variant: "body" }], tables: [] }
      : { paragraphs: [], tables: [] }
  }

  const blocks = htmlToHwpBlocks(html)

  if (blocks.paragraphs.length === 0 && blocks.tables.length === 0) {
    const plain = stripHtml(html)
    if (plain) {
      return { paragraphs: [{ text: plain, variant: "body" }], tables: [] }
    }
  }

  return {
    paragraphs: blocks.paragraphs.map((p) => ({
      text: p.text,
      variant: p.variant,
    })),
    tables: blocks.tables.map(astToHwpxTable),
  }
}
