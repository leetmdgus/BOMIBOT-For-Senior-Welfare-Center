"use client"

import type { PerformanceRow } from "@/services/kanban.performance.types"
import { cn } from "@/lib/utils"

import type { InputGridColumnKey } from "./input-management-excel"

export function GridCellEditor({
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
        type="text"
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
          isActive && "bg-white",
        )}
      />
    </>
  )
}
