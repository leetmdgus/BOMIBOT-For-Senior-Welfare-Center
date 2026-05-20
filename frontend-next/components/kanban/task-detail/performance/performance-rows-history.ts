import type { PerformanceRow } from "@/services/kanban.performance.types"

export const ROWS_HISTORY_LIMIT = 50

export function clonePerformanceRows(rows: PerformanceRow[]): PerformanceRow[] {
  return structuredClone(rows)
}

/** 선택(체크박스)만 바뀐 경우 — 실행 취소 스택에 넣지 않음 */
export function isSelectionOnlyRowsChange(
  prev: PerformanceRow[],
  next: PerformanceRow[],
): boolean {
  if (prev.length !== next.length) return false

  let selectionDiffers = false

  for (let i = 0; i < prev.length; i++) {
    const a = prev[i]
    const b = next[i]
    if (a.id !== b.id) return false

    const { selected: selA, ...dataA } = a
    const { selected: selB, ...dataB } = b

    if (JSON.stringify(dataA) !== JSON.stringify(dataB)) {
      return false
    }

    if (selA !== selB) {
      selectionDiffers = true
    }
  }

  return selectionDiffers
}

export function rowsSnapshotEqual(a: PerformanceRow[], b: PerformanceRow[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}
