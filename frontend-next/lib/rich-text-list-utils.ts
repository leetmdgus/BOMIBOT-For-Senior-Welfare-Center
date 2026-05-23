import { focusActiveRichTextContainer } from "@/lib/rich-text-edit-target"
import { getRichTextTableCellFromSelection } from "@/lib/rich-text-table-utils"

export type RichTextListPreset =
  | "decimal"
  | "decimal-paren"
  | "hangul"
  | "hangul-paren"
  | "bullet"
  | "circle"

const ORDERED_PRESET_CLASS: Record<
  Exclude<RichTextListPreset, "bullet" | "circle">,
  string
> = {
  decimal: "bp-list-decimal",
  "decimal-paren": "list-decimal-paren",
  hangul: "list-hangul",
  "hangul-paren": "list-hangul-paren",
}

const UNORDERED_PRESET_CLASS: Record<"bullet" | "circle", string> = {
  bullet: "bp-list-bullet",
  circle: "list-circle",
}

export function buildRichTextListHtml(
  preset: RichTextListPreset,
  items = ["항목"],
): string {
  const tag = preset === "bullet" || preset === "circle" ? "ul" : "ol"
  const cls =
    preset === "bullet" || preset === "circle"
      ? UNORDERED_PRESET_CLASS[preset]
      : ORDERED_PRESET_CLASS[preset]
  const lis = items.map((t) => `<li>${t}</li>`).join("")
  return `<${tag} class="${cls}">${lis}</${tag}>`
}

function isEmptyCellContent(html: string): boolean {
  const t = html.replace(/&nbsp;/gi, " ").replace(/<br\s*\/?>/gi, "").trim()
  return t === ""
}

function prepareTableCellForListInsert(cell: HTMLTableCellElement): void {
  if (!isEmptyCellContent(cell.innerHTML)) return
  cell.innerHTML = ""
  const range = document.createRange()
  range.selectNodeContents(cell)
  range.collapse(true)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/** 커서가 목록 항목(li) 안에 있는지 */
export function isCursorInRichTextListItem(root: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel?.rangeCount) return false
  let node: Node | null = sel.anchorNode
  while (node && node !== root) {
    if (node instanceof HTMLLIElement) return true
    node = node.parentNode
  }
  return false
}

function findListAncestor(
  node: Node | null,
  boundary: HTMLElement,
): HTMLOListElement | HTMLUListElement | null {  let current: Node | null = node
  while (current && current !== boundary) {
    if (
      current instanceof HTMLOListElement ||
      current instanceof HTMLUListElement
    ) {
      return current
    }
    current = current.parentNode
  }
  return null
}

function applyListClass(list: HTMLOListElement | HTMLUListElement, className: string) {
  list.className = className
  list.removeAttribute("type")
}

function cleanupCellAroundList(cell: HTMLTableCellElement) {
  for (const child of Array.from(cell.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent?.replace(/\u00a0/g, " ").trim() ?? ""
      if (!t) child.remove()
      continue
    }
    if (child instanceof HTMLBRElement) {
      child.remove()
    }
  }
}

export type RichTextListCommand =
  | "insertOrderedList"
  | "insertUnorderedList"
  | "indent"
  | "outdent"

export function applyRichTextListCommand(
  root: HTMLElement,
  command: RichTextListCommand,
  preset?: RichTextListPreset,
): boolean {
  const hit = getRichTextTableCellFromSelection(root)
  if (hit?.cell instanceof HTMLTableCellElement) {
    prepareTableCellForListInsert(hit.cell)
  }

  focusActiveRichTextContainer(root)

  const container = hit?.cell ?? root
  const executed = document.execCommand(command, false)

  if (
    preset &&
    (command === "insertOrderedList" || command === "insertUnorderedList")
  ) {
    const sel = window.getSelection()
    const list = findListAncestor(sel?.anchorNode ?? null, container)
    if (list) {
      const className =
        preset === "bullet" || preset === "circle"
          ? UNORDERED_PRESET_CLASS[preset]
          : ORDERED_PRESET_CLASS[preset]
      applyListClass(list, className)
      if (hit?.cell) cleanupCellAroundList(hit.cell)
    }
  }

  return executed
}

export function insertRichTextHtmlAtSelection(
  root: HTMLElement,
  html: string,
): void {
  const hit = getRichTextTableCellFromSelection(root)
  if (hit?.cell instanceof HTMLTableCellElement) {
    prepareTableCellForListInsert(hit.cell)
  }
  focusActiveRichTextContainer(root)
  document.execCommand("insertHTML", false, html)
  if (hit?.cell) cleanupCellAroundList(hit.cell)
}
