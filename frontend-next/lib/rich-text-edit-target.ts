import {
  getRichTextTableCellFromSelection,
  markRichTextTableCellEditing,
} from "@/lib/rich-text-table-utils"

/** 커서/선택이 있는 편집 컨테이너 — 표 셀 또는 본문 루트 */
export function getActiveRichTextContainer(root: HTMLElement): HTMLElement {
  const hit = getRichTextTableCellFromSelection(root)
  if (hit) return hit.cell
  return root
}

export function focusActiveRichTextContainer(root: HTMLElement): HTMLElement {
  const container = getActiveRichTextContainer(root)
  if (container instanceof HTMLTableCellElement) {
    markRichTextTableCellEditing(container)
    container.focus({ preventScroll: true })
  } else {
    root.focus({ preventScroll: true })
  }
  return container
}
