/** 한글(한컴) 워드 — 글자 크기(px) */

export const DEFAULT_EDITOR_FONT_SIZE_PX = 10

/** 한글 문서용 작은 크기 위주 (px) */
export const HANGUL_FONT_SIZES_PX = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28,
] as const

export type HangulFontSizePx = (typeof HANGUL_FONT_SIZES_PX)[number]

export function parseFontSizePx(value: string | undefined): number | null {
  if (!value) return null
  const m = /^(\d+)\s*px$/i.exec(value.trim())
  if (!m) return null
  const px = Number(m[1])
  return Number.isFinite(px) && px > 0 ? px : null
}

/** 선택 영역·커서에 px 글자 크기 적용 */
export function applyRichTextFontSizePx(
  root: HTMLElement | null,
  px: number,
): boolean {
  if (!root || px <= 0) return false
  root.focus()
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false

  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return false

  if (range.collapsed) {
    const marker = `<span data-bp-fz="${px}" style="font-size:${px}px">\u200b</span>`
    document.execCommand("insertHTML", false, marker)
    const markers = root.querySelectorAll(`span[data-bp-fz="${px}"]`)
    const last = markers[markers.length - 1]
    if (last?.firstChild) {
      const nr = document.createRange()
      nr.setStart(last.firstChild, 1)
      nr.collapse(true)
      sel.removeAllRanges()
      sel.addRange(nr)
    }
    return true
  }

  try {
    const fragment = range.extractContents()
    const span = document.createElement("span")
    span.style.fontSize = `${px}px`
    span.appendChild(fragment)
    range.insertNode(span)
    sel.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(span)
    next.collapse(false)
    sel.addRange(next)
    return true
  } catch {
    document.execCommand("styleWithCSS", false, "true")
    document.execCommand("fontSize", false, "7")
    const spans = root.querySelectorAll('span[style*="font-size"]')
    const last = spans[spans.length - 1] as HTMLElement | undefined
    if (last) last.style.fontSize = `${px}px`
    return true
  }
}
