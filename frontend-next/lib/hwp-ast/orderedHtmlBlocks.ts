import { htmlTableToAst } from "@/lib/hwp-ast/htmlTableToAst"
import type { HwpBlock, HwpParagraphBlock } from "@/lib/hwp-ast/types"
import { sanitizeHwpxText } from "@/lib/hwpx/hwpx-encoding"

function cellText(el: Element): string {
  return sanitizeHwpxText((el.textContent ?? "").replace(/\s+/g, " ").trim() || " ")
}

function paragraphBlock(text: string): HwpParagraphBlock {
  const normalized = sanitizeHwpxText(text.replace(/\s+/g, " ").trim() || " ")
  return {
    type: "paragraph",
    content: [{ type: "text", text: normalized }],
  }
}

/** DOM 순서를 유지한 HwpBlock[] (TipTap 1:1 변환용) */
export function htmlToOrderedHwpBlocks(html: string): HwpBlock[] {
  const blocks: HwpBlock[] = []
  if (!html?.trim()) return blocks
  if (typeof document === "undefined") return blocks

  const root = document.createElement("div")
  root.innerHTML = html

  const walk = (parent: Element) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim()
        if (t) blocks.push(paragraphBlock(t))
        continue
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()

      if (tag === "table") {
        blocks.push(htmlTableToAst(el as HTMLTableElement))
        continue
      }
      if (tag === "h1" || tag === "h2" || el.classList.contains("doc-chapter")) {
        blocks.push(paragraphBlock(cellText(el)))
        continue
      }
      if (
        tag === "h3" ||
        tag === "h4" ||
        el.classList.contains("doc-section") ||
        el.classList.contains("doc-section-plain")
      ) {
        blocks.push(paragraphBlock(cellText(el)))
        continue
      }
      if (tag === "p" || tag === "li") {
        blocks.push(paragraphBlock(cellText(el)))
        continue
      }
      if (tag === "br") continue
      if (["div", "ul", "ol", "tbody", "thead"].includes(tag)) {
        walk(el)
        continue
      }
      blocks.push(paragraphBlock(cellText(el)))
    }
  }

  walk(root)
  return blocks
}
