export type SavedRichTextSelection = {
  range: Range
  /** Ctrl+A 등으로 편집기 전체가 선택된 상태 */
  fullEditor: boolean
}

/** 편집기 전체가 선택됐는지 (Ctrl+A) */
export function isFullEditorSelection(
  root: HTMLElement,
  range: Range,
): boolean {
  if (range.collapsed) return false
  if (!root.contains(range.commonAncestorContainer)) return false

  try {
    const full = document.createRange()
    full.selectNodeContents(root)
    const startsAtOrBefore =
      range.compareBoundaryPoints(Range.START_TO_START, full) <= 0
    const endsAtOrAfter =
      range.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    if (startsAtOrBefore && endsAtOrAfter) return true
  } catch {
    /* compareBoundaryPoints 실패 시 텍스트 길이로 판별 */
  }

  const selected = range.toString().replace(/\u200b/g, "").trim()
  const all = root.innerText.replace(/\u200b/g, "").trim()
  if (!all) return false
  return selected.length >= all.length * 0.98
}

export function captureRichTextSelection(
  root: HTMLElement,
): SavedRichTextSelection | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null

  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  return {
    range: range.cloneRange(),
    fullEditor: isFullEditorSelection(root, range),
  }
}

export function restoreRichTextSelection(
  root: HTMLElement,
  saved: SavedRichTextSelection | null,
): boolean {
  if (!saved) return false

  root.focus()
  const sel = window.getSelection()
  if (!sel) return false

  try {
    sel.removeAllRanges()
    sel.addRange(saved.range)
    return true
  } catch {
    if (!saved.fullEditor) return false
    try {
      const full = document.createRange()
      full.selectNodeContents(root)
      sel.removeAllRanges()
      sel.addRange(full)
      return true
    } catch {
      return false
    }
  }
}

/** 툴바에서 포커스가 빠진 뒤에도 적용할 수 있도록 저장된 선택 복원 */
export function shouldRestoreSavedSelection(
  root: HTMLElement,
  saved: SavedRichTextSelection | null,
): boolean {
  if (!saved) return false

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return true

  const current = sel.getRangeAt(0)
  if (!root.contains(current.commonAncestorContainer)) return true

  if (!saved.range.collapsed && current.collapsed) return true

  if (saved.range.collapsed && current.collapsed) {
    try {
      return (
        saved.range.compareBoundaryPoints(Range.START_TO_START, current) !== 0
      )
    } catch {
      return true
    }
  }

  if (saved.fullEditor) {
    return !isFullEditorSelection(root, current)
  }

  return false
}
