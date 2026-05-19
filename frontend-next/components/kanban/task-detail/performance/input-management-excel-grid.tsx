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
  isCellInRange,
  normalizeRange,
  parseClipboardGrid,
  rangeToTsv,
  type CellPosition,
  type CellRange,
  type InputGridColumnKey,
} from "./input-management-excel"
import { FundingBudgetCell } from "./funding-budget-cell"
import {
  applyActualFunding,
  applyPlanFunding,
  getActualFundingEntries,
  getPlanFundingEntries,
} from "./performance-funding.utils"

type InputManagementExcelGridProps = {
  rows: PerformanceRow[]
  onRowsChange: (rows: PerformanceRow[]) => void
  onOpenActualModal: (rowId: string) => void
  subProjectSuggestions?: string[]
  detailCategorySuggestions?: string[]
}

export function InputManagementExcelGrid({
  rows,
  onRowsChange,
  onOpenActualModal,
  subProjectSuggestions = [],
  detailCategorySuggestions = [],
}: InputManagementExcelGridProps) {
  const tableRef = useRef<HTMLTableSectionElement>(null)
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null)
  const [selection, setSelection] = useState<CellRange | null>(null)
  const [fillPreview, setFillPreview] = useState<CellRange | null>(null)
  const [isFillDragging, setIsFillDragging] = useState(false)
  const fillSourceRef = useRef<CellPosition | null>(null)
  const fillPreviewRef = useRef<CellRange | null>(null)

  const updateCell = useCallback(
    (rowIndex: number, key: InputGridColumnKey, value: string | number) => {
      onRowsChange(
        rows.map((row, index) =>
          index === rowIndex ? { ...row, [key]: value } : row
        )
      )
    },
    [onRowsChange, rows]
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

      if (!selection) return

      event.preventDefault()
      const tsv = rangeToTsv(rows, selection)

      try {
        await navigator.clipboard.writeText(tsv)
      } catch {
        // ignore clipboard errors
      }
    },
    [rows, selection]
  )

  const handleKeyDown = (event: KeyboardEvent) => {
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
      tabIndex={0}
      className="outline-none"
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
    >
      {rows.map((row, rowIndex) => (
        <tr key={row.id} className="hover:bg-sky-50/80">
          {INPUT_GRID_COLUMNS.map((column, colIndex) => {
            const position = { rowIndex, colIndex }
            const selected = isCellInRange(rowIndex, colIndex, highlightRange)
            const isActive =
              activeCell?.rowIndex === rowIndex &&
              activeCell.colIndex === colIndex
            const showFillHandle =
              fillHandlePosition?.rowIndex === rowIndex &&
              fillHandlePosition.colIndex === colIndex

            const isActualColumn =
              column.key === "actualPeople" ||
              column.key === "actualCount" ||
              column.key === "actualExpense"

            const isFundingColumn =
              column.key === "planBudget" || column.key === "actualExpense"

            return (
              <td
                key={column.key}
                data-grid-row={rowIndex}
                data-grid-col={colIndex}
                className={cn(
                  "relative border border-slate-200 p-0",
                  selected && "bg-sky-100/80",
                  isActive && "ring-2 ring-sky-500 ring-inset"
                )}
                onMouseDown={(event) => handleCellMouseDown(event, position)}
                onDoubleClick={() => {
                  if (isActualColumn) {
                    onOpenActualModal(row.id)
                  }
                }}
              >
                {isFundingColumn ? (
                  <FundingBudgetCell
                    variant={
                      column.key === "planBudget" ? "plan" : "actual"
                    }
                    isActive={isActive}
                    entries={
                      column.key === "planBudget"
                        ? getPlanFundingEntries(row)
                        : getActualFundingEntries(row)
                    }
                    onChange={(entries) => {
                      const nextRow =
                        column.key === "planBudget"
                          ? applyPlanFunding(row, entries)
                          : applyActualFunding(row, entries)

                      onRowsChange(
                        rows.map((current, index) =>
                          index === rowIndex ? nextRow : current,
                        ),
                      )
                    }}
                  />
                ) : (
                  <GridCellEditor
                    row={row}
                    columnKey={column.key}
                    type={column.type}
                    isActive={isActive}
                    suggestions={
                      column.key === "subProject"
                        ? subProjectSuggestions
                        : column.key === "detailCategory"
                          ? detailCategorySuggestions
                          : undefined
                    }
                    onChange={(value) =>
                      updateCell(rowIndex, column.key, value)
                    }
                  />
                )}

                {showFillHandle ? (
                  <button
                    type="button"
                    aria-label="채우기"
                    className="absolute -bottom-1 -right-1 z-10 size-2.5 cursor-crosshair border border-slate-600 bg-sky-600"
                    onMouseDown={(event) =>
                      handleFillMouseDown(event, position)
                    }
                  />
                ) : null}
              </td>
            )
          })}
        </tr>
      ))}
    </tbody>
  )
}

function GridCellEditor({
  row,
  columnKey,
  type,
  isActive,
  suggestions,
  onChange,
}: {
  row: PerformanceRow
  columnKey: InputGridColumnKey
  type: "text" | "number"
  isActive: boolean
  suggestions?: string[]
  onChange: (value: string | number) => void
}) {
  const value = row[columnKey]
  const listId =
    suggestions?.length &&
    (columnKey === "subProject" || columnKey === "detailCategory")
      ? `${columnKey}-suggestions-${row.id}`
      : undefined

  return (
    <>
      {listId ? (
        <datalist id={listId}>
          {suggestions?.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ) : null}

      <input
        type={type === "number" ? "text" : "text"}
        inputMode={type === "number" ? "decimal" : "text"}
        list={listId}
        value={type === "number" ? String(value ?? 0) : String(value ?? "")}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const next = event.target.value
          if (type === "number") {
            const cleaned = next.replaceAll(",", "").trim()
            onChange(cleaned === "" ? 0 : Number(cleaned) || 0)
            return
          }
          onChange(next)
        }}
        className={cn(
          "h-8 w-full border-0 bg-transparent px-2 text-sm outline-none",
          type === "number" ? "text-right tabular-nums" : "text-left",
          isActive && "bg-white"
        )}
      />
    </>
  )
}
