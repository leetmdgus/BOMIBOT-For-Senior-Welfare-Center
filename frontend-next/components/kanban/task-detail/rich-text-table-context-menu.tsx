"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  canMergeTableCellRange,
  deleteRichTextTable,
  deleteRichTextTableCell,
  deleteRichTextTableColumn,
  deleteRichTextTableRow,
  findTableWithCellSelection,
  getRichTextTableContext,
  insertRichTextTableCell,
  insertRichTextTableColumn,
  insertRichTextTableRow,
  mergeRichTextTableCellSelection,
  mergeRichTextTableCells,
  mergeRichTextTableCellsLeft,
  mergeRichTextTableCellsRight,
  canMergeCellsLeft,
  canMergeCellsRight,
  splitRichTextTableCellHorizontal,
  splitRichTextTableCellVertical,
  type RichTextTableContext,
} from "@/lib/rich-text-table-utils"
import {
  applyTableCellsFill,
  getCellsInRange,
  TABLE_CELL_FILL_PALETTE,
} from "@/lib/rich-text-table-style"

type MenuPos = { x: number; y: number }

type RichTextTableContextMenuLayerProps = {
  editorRoot: HTMLElement | null
  onChange: () => void
}

export function RichTextTableContextMenuLayer({
  editorRoot,
  onChange,
}: RichTextTableContextMenuLayerProps) {
  const [menu, setMenu] = useState<{
    pos: MenuPos
    ctx: RichTextTableContext
  } | null>(null)
  const [openSub, setOpenSub] = useState<"cell" | "row" | "col" | "fill" | null>(
    null,
  )

  const close = useCallback(() => {
    setMenu(null)
    setOpenSub(null)
  }, [])

  const run = useCallback(
    (fn: (ctx: RichTextTableContext) => boolean | void) => {
      if (!menu) return
      fn(menu.ctx)
      onChange()
      close()
    },
    [menu, onChange, close],
  )

  useEffect(() => {
    const root = editorRoot
    if (!root) return

    const onContextMenu = (e: MouseEvent) => {
      const ctx = getRichTextTableContext(root)
      if (!ctx) return
      e.preventDefault()
      setMenu({ pos: { x: e.clientX, y: e.clientY }, ctx })
      setOpenSub(null)
    }

    root.addEventListener("contextmenu", onContextMenu)
    return () => root.removeEventListener("contextmenu", onContextMenu)
  }, [editorRoot])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-rt-table-menu]")) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [menu, close])

  if (!menu || typeof document === "undefined") return null

  const ctx = menu.ctx
  const cellSelection = editorRoot
    ? findTableWithCellSelection(editorRoot)
    : null
  const canMergeSelection =
    cellSelection &&
    canMergeTableCellRange(cellSelection.table, cellSelection.range)

  const fillTargetCells = cellSelection
    ? getCellsInRange(cellSelection.table, cellSelection.range)
    : [ctx.cell]

  const applyFill = (color: string | null) => {
    applyTableCellsFill(fillTargetCells, color)
    onChange()
    close()
  }

  return createPortal(
    <div
      data-rt-table-menu
      className="fixed z-[200] min-w-[200px] rounded-md border border-gray-300 bg-white py-1 text-sm shadow-lg"
      style={{ left: menu.pos.x, top: menu.pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        label="붙여넣기"
        hint="Ctrl+V"
        onClick={() => {
          document.execCommand("paste")
          onChange()
          close()
        }}
      />

      <SubMenuTrigger
        label="셀"
        open={openSub === "cell"}
        onOpen={() => setOpenSub("cell")}
      >
        <MenuItem
          label="앞에 셀 삽입"
          onClick={() => run((c) => insertRichTextTableCell(c, "before"))}
        />
        <MenuItem
          label="뒤에 셀 삽입"
          onClick={() => run((c) => insertRichTextTableCell(c, "after"))}
        />
        <MenuItem
          label="셀 삭제"
          onClick={() => run((c) => deleteRichTextTableCell(c))}
        />
        <MenuDivider />
        <MenuItem
          label="셀 합치기"
          onClick={() => {
            if (editorRoot && mergeRichTextTableCellSelection(editorRoot)) {
              onChange()
              close()
              return
            }
            run((c) => mergeRichTextTableCells(c))
          }}
        />
        <MenuItem
          label="오른쪽 합치기"
          disabled={!canMergeCellsRight(ctx)}
          onClick={() => run((c) => mergeRichTextTableCellsRight(c))}
        />
        <MenuItem
          label="왼쪽 합치기"
          disabled={!canMergeCellsLeft(ctx)}
          onClick={() => run((c) => mergeRichTextTableCellsLeft(c))}
        />
        <MenuDivider />
        <MenuItem
          label="수평 나누기"
          onClick={() => run((c) => splitRichTextTableCellHorizontal(c))}
        />
        <MenuItem
          label="수직 나누기"
          onClick={() => run((c) => splitRichTextTableCellVertical(c))}
        />
      </SubMenuTrigger>

      <SubMenuTrigger
        label="셀 배경색"
        open={openSub === "fill"}
        onOpen={() => setOpenSub("fill")}
      >
        <MenuItem label="배경 없음" onClick={() => applyFill(null)} />
        <MenuDivider />
        <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
          {TABLE_CELL_FILL_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className={cn(
                "size-6 rounded-sm border border-gray-300/80 hover:ring-2 hover:ring-primary/40",
                color === "#FFFFFF" && "bg-white",
              )}
              style={{ backgroundColor: color }}
              onClick={() => applyFill(color)}
            />
          ))}
        </div>
      </SubMenuTrigger>

      <SubMenuTrigger
        label="행"
        open={openSub === "row"}
        onOpen={() => setOpenSub("row")}
      >
        <MenuItem
          label="위에 행 삽입"
          onClick={() => run((c) => insertRichTextTableRow(c, "before"))}
        />
        <MenuItem
          label="아래에 행 삽입"
          onClick={() => run((c) => insertRichTextTableRow(c, "after"))}
        />
        <MenuItem
          label="행 삭제"
          onClick={() => run((c) => deleteRichTextTableRow(c))}
        />
      </SubMenuTrigger>

      <SubMenuTrigger
        label="열"
        open={openSub === "col"}
        onOpen={() => setOpenSub("col")}
      >
        <MenuItem
          label="왼쪽에 열 삽입"
          onClick={() => run((c) => insertRichTextTableColumn(c, "before"))}
        />
        <MenuItem
          label="오른쪽에 열 삽입"
          onClick={() => run((c) => insertRichTextTableColumn(c, "after"))}
        />
        <MenuItem
          label="열 삭제"
          onClick={() => run((c) => deleteRichTextTableColumn(c))}
        />
      </SubMenuTrigger>

      <MenuDivider />
      <MenuItem
        label="표 삭제"
        onClick={() => {
          deleteRichTextTable(ctx.table)
          onChange()
          close()
        }}
      />
    </div>,
    document.body,
  )
}

function MenuItem({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string
  hint?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100",
        disabled && "pointer-events-none opacity-40",
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      {hint ? <span className="text-xs text-gray-400">{hint}</span> : null}
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-gray-200" />
}

function SubMenuTrigger({
  label,
  open,
  onOpen,
  children,
}: {
  label: string
  open: boolean
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100"
      >
        <span>{label}</span>
        <ChevronRight className="size-3.5 text-gray-500" />
      </button>
      {open ? (
        <div className="absolute left-full top-0 z-10 ml-0.5 min-w-[180px] rounded-md border border-gray-300 bg-white py-1 shadow-lg">
          {children}
        </div>
      ) : null}
    </div>
  )
}
