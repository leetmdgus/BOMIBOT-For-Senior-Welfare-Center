"use client"

import { useEffect } from "react"

import {
  buildTableGridMap,
  clearTableCellSelection,
  getCellBounds,
  getTableCellSelection,
  setTableCellSelection,
  type CellRange,
} from "@/lib/rich-text-table-grid"
import {
  ensureTableStructure,
  focusRichTextTableCell,
  moveRichTextTableTabFocus,
} from "@/lib/rich-text-table-utils"

const DRAG_THRESHOLD_PX = 4

type RichTextTableSelectionLayerProps = {
  editorRoot: HTMLElement | null
  onChange?: () => void
}

type DragState = {
  table: HTMLTableElement
  anchorCell: HTMLTableCellElement
  startRow: number
  startCol: number
  startX: number
  startY: number
  active: boolean
}

function isResizeHandleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(".bp-rt-col-resize, .bp-rt-row-resize"),
  )
}

function isTableChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      "[data-rte-table-chrome], [data-rt-table-menu], .bp-rich-editor-toolbar",
    ),
  )
}

function getTableCellFromTarget(
  root: HTMLElement,
  target: EventTarget | null,
): { table: HTMLTableElement; cell: HTMLTableCellElement } | null {
  if (!(target instanceof Element)) return null
  if (isResizeHandleTarget(target)) return null

  const cell = target.closest("td, th")
  if (!(cell instanceof HTMLTableCellElement)) return null

  const table = cell.closest("table")
  if (!(table instanceof HTMLTableElement) || !root.contains(table)) return null

  return { table, cell }
}

function clearOtherTableSelections(
  root: HTMLElement,
  activeTable: HTMLTableElement,
) {
  root.querySelectorAll("table").forEach((table) => {
    if (table instanceof HTMLTableElement && table !== activeTable) {
      clearTableCellSelection(table)
    }
  })
}

function rangeFromAnchor(
  startRow: number,
  startCol: number,
  endCell: HTMLTableCellElement,
  table: HTMLTableElement,
): CellRange | null {
  const endBounds = getCellBounds(table, endCell)
  if (!endBounds) return null
  return {
    startRow,
    startCol,
    endRow: endBounds.maxR,
    endCol: endBounds.maxC,
  }
}

export function RichTextTableSelectionLayer({
  editorRoot,
  onChange,
}: RichTextTableSelectionLayerProps) {
  useEffect(() => {
    const root = editorRoot
    if (!root) return

    let drag: DragState | null = null

    const applyRange = (table: HTMLTableElement, range: CellRange) => {
      setTableCellSelection(table, range)
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (isTableChromeTarget(e.target)) return

      const hit = getTableCellFromTarget(root, e.target)
      if (!hit) return

      const { table, cell } = hit
      ensureTableStructure(table)
      const bounds = getCellBounds(table, cell)
      if (!bounds) return

      e.preventDefault()
      window.getSelection()?.removeAllRanges()

      clearOtherTableSelections(root, table)

      const existing = e.shiftKey ? getTableCellSelection(table) : null

      if (existing && e.shiftKey) {
        const range = rangeFromAnchor(
          existing.startRow,
          existing.startCol,
          cell,
          table,
        )
        if (range) applyRange(table, range)
        return
      }

      applyRange(table, {
        startRow: bounds.minR,
        startCol: bounds.minC,
        endRow: bounds.minR,
        endCol: bounds.minC,
      })

      drag = {
        table,
        anchorCell: cell,
        startRow: bounds.minR,
        startCol: bounds.minC,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!drag) return

      if (!drag.active) {
        const dx = Math.abs(e.clientX - drag.startX)
        const dy = Math.abs(e.clientY - drag.startY)
        if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return
        drag.active = true
        document.body.classList.add("bp-rt-table-selecting")
        e.preventDefault()
        window.getSelection()?.removeAllRanges()
      }

      const under = document.elementFromPoint(e.clientX, e.clientY)
      const hit = getTableCellFromTarget(root, under)
      if (!hit || hit.table !== drag.table) return

      const range = rangeFromAnchor(
        drag.startRow,
        drag.startCol,
        hit.cell,
        drag.table,
      )
      if (range) applyRange(drag.table, range)
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!drag) return

      if (drag.active) {
        e.preventDefault()
        onChange?.()
      } else {
        const map = buildTableGridMap(drag.table)
        const anchor =
          map.grid[drag.startRow]?.[drag.startCol] ?? drag.anchorCell
        focusRichTextTableCell(anchor)
      }

      document.body.classList.remove("bp-rt-table-selecting")
      drag = null
    }

    const onClickOutside = (e: MouseEvent) => {
      if (isTableChromeTarget(e.target)) return
      const hit = getTableCellFromTarget(root, e.target)
      if (hit) return
      root.querySelectorAll("table").forEach((table) => {
        if (table instanceof HTMLTableElement) {
          clearTableCellSelection(table)
        }
      })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const moved = moveRichTextTableTabFocus(root, e.shiftKey)
        if (moved) {
          e.preventDefault()
          e.stopPropagation()
          onChange?.()
        }
        return
      }

      if (e.key !== "Escape") return
      root.querySelectorAll("table").forEach((table) => {
        if (table instanceof HTMLTableElement) {
          clearTableCellSelection(table)
        }
      })
    }

    root.addEventListener("mousedown", onMouseDown, true)
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
    root.addEventListener("click", onClickOutside)
    root.addEventListener("keydown", onKeyDown, true)

    return () => {
      root.removeEventListener("mousedown", onMouseDown, true)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      root.removeEventListener("click", onClickOutside)
      root.removeEventListener("keydown", onKeyDown, true)
      document.body.classList.remove("bp-rt-table-selecting")
    }
  }, [editorRoot, onChange])

  return null
}
