/** 리치 에디터 HTML 스냅샷 — 표 DOM 조작 등 execCommand undo 미지원 작업용 */
export type RichTextEditorHistory = {
  push: (html: string) => void
  undo: (currentHtml: string) => string | null
  redo: (currentHtml: string) => string | null
  clear: () => void
}

const MAX_SNAPSHOTS = 80

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
  }
}
