"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react"
import type { PerformanceRow } from "@/services/kanban.performance.types"
import { cn } from "@/lib/utils"

import {
  INPUT_GRID_COLUMNS,
  applyGridToRows,
  fillRangeValues,
  normalizeRange,
  parseClipboardGrid,
  rangeToTsv,
  type CellPosition,
  type CellRange,
  type InputGridColumnKey,
} from "./input-management-excel"
import { isEditableTarget } from "./input-management-row-selection"
import { InputManagementGridRow } from "./input-management-grid-row"
import { usePerformance } from "./performance-provider"

type InputManagementExcelGridProps = {
  rows: PerformanceRow[]
  onRowsChange: (rows: PerformanceRow[]) => void
  onOpenActualModal: (rowId: string) => void
  onRowSelect: (rowId: string, shiftKey: boolean) => void
  hasRowSelection?: boolean
  enableRowReorder?: boolean
  /** 읽기전용(스냅샷 보기) 모드 — 셀 편집·선택·붙여넣기 차단 */
  readOnly?: boolean
  subProjectSuggestions?: string[]
  detailCategorySuggestions?: string[]
}

export function InputManagementExcelGrid({
  rows,
  onRowsChange,
  onOpenActualModal,
  onRowSelect,
  hasRowSelection = false,
  enableRowReorder = false,
  readOnly = false,
  subProjectSuggestions = [],
  detailCategorySuggestions = [],
}: InputManagementExcelGridProps) {
  const { undoRows, redoRows, canUndoRows, canRedoRows } = usePerformance()
  const tableRef = useRef<HTMLTableSectionElement>(null)
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null)
  const [selection, setSelection] = useState<CellRange | null>(null)
  const [fillPreview, setFillPreview] = useState<CellRange | null>(null)
  const [isFillDragging, setIsFillDragging] = useState(false)
  const fillSourceRef = useRef<CellPosition | null>(null)
  const fillPreviewRef = useRef<CellRange | null>(null)

  const updateCell = useCallback(
    (rowIndex: number, key: InputGridColumnKey, value: string | number) => {
      if (readOnly) return
      onRowsChange(
        rows.map((row, index) =>
          index === rowIndex ? { ...row, [key]: value } : row
        )
      )
    },
    [onRowsChange, rows, readOnly]
  )

  const commitSelection = useCallback((range: CellRange) => {
    setSelection(normalizeRange(range))
    setActiveCell(range.end)
  }, [])

  const handleCellMouseDown = (
    event: React.MouseEvent,
    position: CellPosition
  ) => {
    if (event.button !== 0) return

    event.preventDefault()
    tableRef.current?.focus()

    if (event.shiftKey && activeCell) {
      commitSelection({ start: activeCell, end: position })
      return
    }

    setActiveCell(position)
    setSelection({ start: position, end: position })
    setFillPreview(null)
  }

  const handleFillMouseDown = (
    event: React.MouseEvent,
    source: CellPosition
  ) => {
    event.preventDefault()
    event.stopPropagation()

    fillSourceRef.current = source
    setIsFillDragging(true)
    setFillPreview({ start: source, end: source })
  }

  useEffect(() => {
    fillPreviewRef.current = fillPreview
  }, [fillPreview])

  useEffect(() => {
    if (!isFillDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const cell = target?.closest<HTMLElement>("[data-grid-row][data-grid-col]")

      if (!cell || !fillSourceRef.current) return

      const rowIndex = Number(cell.dataset.gridRow)
      const colIndex = Number(cell.dataset.gridCol)

      if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return

      setFillPreview({
        start: fillSourceRef.current,
        end: { rowIndex, colIndex },
      })
    }

    const handleMouseUp = () => {
      const source = fillSourceRef.current
      const preview = fillPreviewRef.current

      if (source && preview) {
        onRowsChange(fillRangeValues(rows, source, preview))
      }

      fillSourceRef.current = null
      setIsFillDragging(false)
      setFillPreview(null)

      if (source && preview) {
        commitSelection({ start: source, end: preview.end })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [commitSelection, fillPreview, isFillDragging, onRowsChange, rows])

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const text = event.clipboardData.getData("text")
      if (!text || (!text.includes("\t") && !text.includes("\n"))) return

      const start = activeCell ?? selection?.start
      if (!start) return

      event.preventDefault()
      const grid = parseClipboardGrid(text)
      onRowsChange(applyGridToRows(rows, start, grid))
    },
    [activeCell, onRowsChange, rows, selection]
  )

  const handleCopy = useCallback(
    async (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") {
        return
      }

      if (hasRowSelection) return

      if (!selection) return

      event.preventDefault()
      const tsv = rangeToTsv(rows, selection)

      try {
        await navigator.clipboard.writeText(tsv)
      } catch {
        // ignore clipboard errors
      }
    },
    [hasRowSelection, rows, selection]
  )

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && !isEditableTarget(event.target)) {
      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey && canUndoRows) {
        event.preventDefault()
        undoRows()
        return
      }
      if ((key === "y" || (key === "z" && event.shiftKey)) && canRedoRows) {
        event.preventDefault()
        redoRows()
        return
      }
    }

    if (!activeCell) {
      handleCopy(event)
      return
    }

    if (event.key === "Escape") {
      setFillPreview(null)
      setIsFillDragging(false)
      return
    }

    handleCopy(event)

    const moveActive = (next: CellPosition) => {
      const clamped = {
        rowIndex: Math.max(0, Math.min(rows.length - 1, next.rowIndex)),
        colIndex: Math.max(
          0,
          Math.min(INPUT_GRID_COLUMNS.length - 1, next.colIndex)
        ),
      }

      if (event.shiftKey) {
        commitSelection({
          start: selection?.start ?? activeCell,
          end: clamped,
        })
        return
      }

      setActiveCell(clamped)
      setSelection({ start: clamped, end: clamped })
    }

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        moveActive({
          rowIndex: activeCell.rowIndex - 1,
          colIndex: activeCell.colIndex,
        })
        break
      case "ArrowDown":
        event.preventDefault()
        moveActive({
          rowIndex: activeCell.rowIndex + 1,
          colIndex: activeCell.colIndex,
        })
        break
      case "ArrowLeft":
        event.preventDefault()
        moveActive({
          rowIndex: activeCell.rowIndex,
          colIndex: activeCell.colIndex - 1,
        })
        break
      case "ArrowRight":
      case "Tab":
        event.preventDefault()
        moveActive({
          rowIndex: activeCell.rowIndex,
          colIndex: activeCell.colIndex + 1,
        })
        break
      case "Enter":
        event.preventDefault()
        moveActive({
          rowIndex: activeCell.rowIndex + 1,
          colIndex: activeCell.colIndex,
        })
        break
      default:
        break
    }
  }

  const highlightRange = fillPreview ?? selection
  const fillHandlePosition =
    selection && !isFillDragging
      ? {
          rowIndex: Math.max(selection.start.rowIndex, selection.end.rowIndex),
          colIndex: Math.max(selection.start.colIndex, selection.end.colIndex),
        }
      : null

  return (
    <tbody
      ref={tableRef}
      tabIndex={readOnly ? -1 : 0}
      className={cn("outline-none", readOnly && "pointer-events-none select-none")}
      onPaste={readOnly ? undefined : handlePaste}
      onKeyDown={readOnly ? undefined : handleKeyDown}
    >
      {rows.map((row, rowIndex) => (
        <InputManagementGridRow
          key={row.id}
          row={row}
          rowIndex={rowIndex}
          enableRowReorder={enableRowReorder}
          readOnly={readOnly}
          highlightRange={readOnly ? null : highlightRange}
          activeCell={readOnly ? null : activeCell}
          fillHandlePosition={readOnly ? null : fillHandlePosition}
          onRowSelect={onRowSelect}
          onOpenActualModal={onOpenActualModal}
          onRowsChange={onRowsChange}
          rows={rows}
          updateCell={updateCell}
          handleCellMouseDown={handleCellMouseDown}
          handleFillMouseDown={handleFillMouseDown}
          subProjectSuggestions={subProjectSuggestions}
          detailCategorySuggestions={detailCategorySuggestions}
        />
      ))}
    </tbody>
  )
}
