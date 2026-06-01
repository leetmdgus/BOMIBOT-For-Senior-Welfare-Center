/** 인쇄 직전 contentEditable 본문 동기화 */
export const RICH_TEXT_FLUSH_BEFORE_PRINT = "bp-rich-text-flush"

function dispatchRichTextFlush(editor: HTMLElement): void {
  editor.dispatchEvent(
    new CustomEvent(RICH_TEXT_FLUSH_BEFORE_PRINT, { bubbles: true }),
  )
}

/** 사업계획·평가 에디터 등 페이지 전체 리치텍스트 동기화 */
export function flushRichTextEditors(): void {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  for (const editor of document.querySelectorAll<HTMLElement>(
    ".bp-rich-editor[contenteditable]",
  )) {
    dispatchRichTextFlush(editor)
  }
}

/** flush 후 React state 반영까지 짧게 대기 (HWPX 다운로드 직전) */
export function flushRichTextEditorsAndWait(): Promise<void> {
  flushRichTextEditors()
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** HWPX·인쇄 직전 — 편집 중인 리치텍스트를 state에 반영 */
export function flushPrintAreaEditors(): void {
  flushRichTextEditors()
}

/** .print-area 클론 — 툴바·편집 UI 제거, 본문 HTML만 */
export function preparePrintAreaHtml(printArea: HTMLElement): string {
  flushPrintAreaEditors()

  const clone = printArea.cloneNode(true) as HTMLElement

  clone
    .querySelectorAll(
      ".print-hide, [data-print-chrome], [aria-label='첨부 자료'], .document-media-sections",
    )
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
