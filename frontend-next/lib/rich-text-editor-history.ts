/** 리치 에디터 HTML 스냅샷 — typing·서식·표 DOM 등 execCommand undo 미지원 작업 공용 */
export type RichTextEditorHistory = {
  /** 변경 직전 HTML을 스택에 저장 (연속 동일 값은 무시) */
  push: (html: string) => void
  undo: (currentHtml: string) => string | null
  redo: (currentHtml: string) => string | null
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

const MAX_SNAPSHOTS = 100

export function createRichTextEditorHistory(): RichTextEditorHistory {
  const undoStack: string[] = []
  const redoStack: string[] = []

  return {
    push(html: string) {
      const last = undoStack[undoStack.length - 1]
      if (last === html) return
      undoStack.push(html)
      if (undoStack.length > MAX_SNAPSHOTS) {
        undoStack.shift()
      }
      redoStack.length = 0
    },

    undo(currentHtml: string) {
      if (undoStack.length === 0) return null
      redoStack.push(currentHtml)
      return undoStack.pop() ?? null
    },

    redo(currentHtml: string) {
      if (redoStack.length === 0) return null
      undoStack.push(currentHtml)
      return redoStack.pop() ?? null
    },

    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },

    canUndo() {
      return undoStack.length > 0
    },

    canRedo() {
      return redoStack.length > 0
    },
  }
}
