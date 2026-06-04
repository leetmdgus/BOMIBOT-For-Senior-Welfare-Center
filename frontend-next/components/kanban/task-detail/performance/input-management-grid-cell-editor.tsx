"use client"

import type { KeyboardEvent } from "react"

import type { PerformanceRow } from "@/services/kanban.performance.types"
import { cn } from "@/lib/utils"

import type { InputGridColumnKey } from "./input-management-excel"

export function GridCellEditor({
  row,
  columnKey,
  type,
  isActive,
  readOnly = false,
  suggestions,
  onChange,
}: {
  row: PerformanceRow
  columnKey: InputGridColumnKey
  type: "text" | "number"
  isActive: boolean
  readOnly?: boolean
  suggestions?: string[]
  onChange: (value: string | number) => void
}) {
  const value = row[columnKey]
  const listId =
    suggestions?.length &&
    (columnKey === "subProject" || columnKey === "detailCategory")
      ? `${columnKey}-suggestions-${row.id}`
      : undefined

  // 엔터 → 같은 열의 바로 아래 셀로 이동(엑셀 동작). 마지막 행이면 그대로 둔다.
  const handleEnterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    const cell = event.currentTarget.closest<HTMLTableCellElement>(
      "td[data-grid-row][data-grid-col]",
    )
    if (!cell) return
    const rowIndex = Number(cell.dataset.gridRow)
    const colIndex = Number(cell.dataset.gridCol)
    if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return
    const nextInput = cell
      .closest("tbody")
      ?.querySelector<HTMLInputElement>(
        `td[data-grid-row="${rowIndex + 1}"][data-grid-col="${colIndex}"] input`,
      )
    if (nextInput) {
      nextInput.focus()
      nextInput.select()
    }
  }

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
        type="text"
        inputMode={type === "number" ? "decimal" : "text"}
        list={readOnly ? undefined : listId}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        value={type === "number" ? String(value ?? 0) : String(value ?? "")}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={readOnly ? undefined : handleEnterKeyDown}
        onChange={(event) => {
          if (readOnly) return
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
          // 세목/세세목 자동완성(datalist) 입력에 브라우저가 그리는 드롭다운 화살표 제거
          "appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-list-button]:hidden",
          type === "number" ? "text-right tabular-nums" : "text-left",
          isActive && "bg-white",
          // 엑셀 커서가 올라간(활성) 셀: 파란색 볼드 강조
          isActive && "font-bold text-sky-600",
          readOnly && "cursor-default text-slate-600",
        )}
      />
    </>
  )
}
