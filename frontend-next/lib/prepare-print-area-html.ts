/** 인쇄 직전 contentEditable 본문 동기화 */
export const RICH_TEXT_FLUSH_BEFORE_PRINT = "bp-rich-text-flush"

/** .print-area 클론 — 툴바·편집 UI 제거, 본문 HTML만 */
export function preparePrintAreaHtml(printArea: HTMLElement): string {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  for (const editor of printArea.querySelectorAll<HTMLElement>(
    ".bp-rich-editor[contenteditable]",
  )) {
    editor.dispatchEvent(
      new CustomEvent(RICH_TEXT_FLUSH_BEFORE_PRINT, { bubbles: true }),
    )
  }

  const clone = printArea.cloneNode(true) as HTMLElement

  clone
    .querySelectorAll(".print-hide, [data-print-chrome]")
    .forEach((node) => node.remove())

  clone
    .querySelectorAll(".bp-rt-col-resize, .bp-rt-row-resize")
    .forEach((node) => node.remove())

  clone.querySelectorAll("[contenteditable]").forEach((node) => {
    node.removeAttribute("contenteditable")
  })

  clone
    .querySelectorAll(".bp-rt-cell-editing, .bp-rt-cell-selected")
    .forEach((node) => {
      node.classList.remove("bp-rt-cell-editing", "bp-rt-cell-selected")
    })

  return clone.innerHTML
}
