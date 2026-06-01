import type { JSONContent } from "@tiptap/core"

import { astTableToHtml } from "@/lib/hwp-ast/astTableToHtml"
import { paragraphTextFromBlocks } from "@/lib/hwp-ast/htmlTableToAst"
import { htmlToOrderedHwpBlocks } from "@/lib/hwp-ast/orderedHtmlBlocks"
import { hwpBlocksToTipTapDoc } from "@/lib/hwp-ast/tiptap/ast-to-tiptap"
import { tipTapDocToHwpBlocks } from "@/lib/hwp-ast/tiptap/tiptap-to-ast"
import type { HwpBlock } from "@/lib/hwp-ast/types"

/** HTML → ordered AST → TipTap doc */
export function htmlToTipTapDoc(html: string): JSONContent {
  return hwpBlocksToTipTapDoc(htmlToOrderedHwpBlocks(html))
}

/** TipTap doc → AST → HTML (표 + 문단) */
export function tipTapDocToHtml(doc: JSONContent): string {
  const blocks = tipTapDocToHwpBlocks(doc)
  const parts: string[] = []

  for (const block of blocks) {
    if (block.type === "table") {
      parts.push(astTableToHtml(block))
      continue
    }
    const text = paragraphTextFromBlocks([block])
    if (text.trim()) {
      parts.push(`<p>${escapeHtml(text)}</p>`)
    }
  }

  return parts.join("")
}

/** 기존 bp-rich-editor HTML ↔ TipTap doc (AST 경유, DOM 순서 유지) */
export function richTextHtmlToTipTapDoc(html: string): JSONContent {
  return htmlToTipTapDoc(html)
}

export function tipTapDocToRichTextHtml(doc: JSONContent): string {
  return tipTapDocToHtml(doc)
}

export function assertHwpAstTipTapRoundTrip(blocks: HwpBlock[]): HwpBlock[] {
  const doc = hwpBlocksToTipTapDoc(blocks)
  return tipTapDocToHwpBlocks(doc)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
