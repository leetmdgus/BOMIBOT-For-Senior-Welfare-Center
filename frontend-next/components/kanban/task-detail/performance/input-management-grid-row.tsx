"use client"

import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"
import { GripVertical } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import type { PerformanceRow } from "@/services/kanban.performance.types"
import { cn } from "@/lib/utils"

import { FundingBudgetCell } from "./funding-budget-cell"
import {
  INPUT_GRID_COLUMNS,
  isCellInRange,
  type CellPosition,
  type CellRange,
  type InputGridColumnKey,
} from "./input-management-excel"
import { GridCellEditor } from "./input-management-grid-cell-editor"
import {
  applyActualFunding,
  applyPlanFunding,
  getActualFundingEntries,
  getPlanFundingEntries,
} from "./performance-funding.utils"

export type InputManagementGridRowProps = {
  row: PerformanceRow
  rowIndex: number
  enableRowReorder: boolean
  highlightRange: CellRange | null
  activeCell: CellPosition | null
  fillHandlePosition: CellPosition | null
  onToggleRowSelection: (rowId: string) => void
  onOpenActualModal: (rowId: string) => void
  onRowsChange: (rows: PerformanceRow[]) => void
  rows: PerformanceRow[]
  updateCell: (
    rowIndex: number,
    key: InputGridColumnKey,
    value: string | number,
  ) => void
  handleCellMouseDown: (
    event: React.MouseEvent,
    position: CellPosition,
  ) => void
  handleFillMouseDown: (event: React.MouseEvent, source: CellPosition) => void
  subProjectSuggestions: string[]
  detailCategorySuggestions: string[]
}

export function InputManagementGridRow({
  row,
  rowIndex,
  enableRowReorder,
  highlightRange,
  activeCell,
  fillHandlePosition,
  onToggleRowSelection,
  onOpenActualModal,
  onRowsChange,
  rows,
  updateCell,
  handleCellMouseDown,
  handleFillMouseDown,
  subProjectSuggestions,
  detailCategorySuggestions,
}: InputManagementGridRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    disabled: !enableRowReorder,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:bg-sky-50/80",
        isDragging && "relative z-20 bg-sky-100/90 shadow-md",
      )}
    >
      <td className="w-8 border border-slate-200 bg-white p-0 text-center">
        {enableRowReorder ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="flex h-8 w-full cursor-grab items-center justify-center text-muted-foreground hover:text-slate-700 active:cursor-grabbing"
            aria-label="행 순서 변경"
            onMouseDown={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
      </td>
      <td className="w-10 border border-slate-200 bg-white p-0 text-center">
        <div className="flex h-8 items-center justify-center">
          <Checkbox
            checked={row.selected}
            onCheckedChange={() => onToggleRowSelection(row.id)}
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="행 선택"
          />
        </div>
      </td>
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
              isActive && "ring-2 ring-sky-500 ring-inset",
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
                variant={column.key === "planBudget" ? "plan" : "actual"}
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
                onChange={(value) => updateCell(rowIndex, column.key, value)}
              />
            )}

            {showFillHandle ? (
              <button
                type="button"
                aria-label="채우기"
                className="absolute -bottom-1 -right-1 z-10 size-2.5 cursor-crosshair border border-slate-600 bg-sky-600"
                onMouseDown={(event) => handleFillMouseDown(event, position)}
              />
            ) : null}
          </td>
        )
      })}
    </tr>
  )
}
