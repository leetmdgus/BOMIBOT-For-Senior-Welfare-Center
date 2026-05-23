import {
  buildTableGridMap,
  canMergeTableCellRange,
  clearTableCellSelection,
  collectCellsInRange,
  findTableWithCellSelection,
  getCellBounds,
  getTableCellSelection,
  refreshAllTableCellSelectionVisuals,
  setTableCellSelection,
  type CellRange,
} from "@/lib/rich-text-table-grid"

export type { CellRange }

export type RichTextTableContext = {
  table: HTMLTableElement
  row: HTMLTableRowElement
  cell: HTMLTableCellElement
  rowIndex: number
  colIndex: number
}

const CELL_CLASS =
  "border border-black p-2 align-top min-w-[48px] min-h-[28px]"
const TABLE_CLASS =
  "bp-rt-table w-full border-collapse border border-black text-sm my-2 table-fixed"

export function applyRichTextTableCellDefaults(cell: HTMLTableCellElement) {
  for (const token of CELL_CLASS.split(/\s+/)) {
    cell.classList.add(token)
  }
  if (!cell.hasAttribute("contenteditable")) {
    cell.setAttribute("contenteditable", "true")
  }
  cell.setAttribute("tabindex", "-1")
  if (!cell.innerHTML.trim()) {
    cell.innerHTML = "&nbsp;"
  }
}

export function ensureTableStructure(table: HTMLTableElement) {
  table.classList.add(
    "bp-rt-table",
    "w-full",
    "border-collapse",
    "border",
    "border-black",
    "text-sm",
    "my-2",
    "table-fixed",
  )
  if (!table.querySelector("colgroup")) {
    const colCount = Math.max(
      ...Array.from(table.rows).map((r) => r.cells.length),
      1,
    )
    const colgroup = document.createElement("colgroup")
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement("col")
      col.style.width = `${Math.round(100 / colCount)}%`
      colgroup.appendChild(col)
    }
    table.insertBefore(colgroup, table.firstChild)
  }
  Array.from(table.rows).forEach((row) => {
    Array.from(row.cells).forEach(applyRichTextTableCellDefaults)
  })
}

export function getRichTextTableContext(
  root: HTMLElement | null,
): RichTextTableContext | null {
  const sel = window.getSelection()
  if (!root || !sel?.rangeCount) return null

  let node: Node | null = sel.anchorNode
  while (node && node !== root) {
    if (node instanceof HTMLTableCellElement) {
      const row = node.parentElement as HTMLTableRowElement | null
      const table = row?.closest("table")
      if (table && root.contains(table)) {
        ensureTableStructure(table)
        const rowIndex = Array.from(table.rows).indexOf(row!)
        const colIndex = Array.from(row!.cells).indexOf(node)
        return { table, row: row!, cell: node, rowIndex, colIndex }
      }
    }
    node = node.parentNode
  }
  return null
}

export function buildTableHtml(rows: number, cols: number): string {
  const safeRows = Math.min(Math.max(rows, 1), 30)
  const safeCols = Math.min(Math.max(cols, 1), 20)
  const colgroup = Array.from({ length: safeCols }, () => {
    const pct = Math.round(100 / safeCols)
    return `<col style="width:${pct}%" />`
  }).join("")
  const cell = `<td class="${CELL_CLASS.replace(/ /g, " ")}" contenteditable="true">&nbsp;</td>`
  const body = Array.from({ length: safeRows }, () => `<tr>${cell.repeat(safeCols)}</tr>`).join(
    "",
  )
  return `<table class="${TABLE_CLASS}"><colgroup>${colgroup}</colgroup><tbody>${body}</tbody></table><p><br></p>`
}

export function insertRichTextTable(
  root: HTMLElement,
  rows: number,
  cols: number,
): void {
  root.focus()
  document.execCommand("insertHTML", false, buildTableHtml(rows, cols))
}

export function deleteRichTextTable(table: HTMLTableElement): void {
  const wrapper = table.closest(".bp-rt-table-wrap") ?? table
  wrapper.remove()
}

export function insertRichTextTableRow(
  ctx: RichTextTableContext,
  position: "before" | "after",
): void {
  const colCount = ctx.row.cells.length
  const newRow = ctx.table.insertRow(
    position === "before" ? ctx.rowIndex : ctx.rowIndex + 1,
  )
  for (let i = 0; i < colCount; i++) {
    applyRichTextTableCellDefaults(newRow.insertCell(i))
  }
}

export function deleteRichTextTableRow(ctx: RichTextTableContext): boolean {
  if (ctx.table.rows.length <= 1) return false
  ctx.row.remove()
  return true
}

export function insertRichTextTableColumn(
  ctx: RichTextTableContext,
  position: "before" | "after",
): void {
  const insertAt = position === "before" ? ctx.colIndex : ctx.colIndex + 1
  const colgroup = ctx.table.querySelector("colgroup")
  if (colgroup) {
    const col = document.createElement("col")
    col.style.width = "10%"
    const ref = colgroup.children[insertAt] ?? null
    colgroup.insertBefore(col, ref)
  }
  Array.from(ctx.table.rows).forEach((row) => {
    const cell = row.insertCell(insertAt)
    applyRichTextTableCellDefaults(cell)
  })
}

export function deleteRichTextTableColumn(ctx: RichTextTableContext): boolean {
  if (ctx.table.rows[0]?.cells.length <= 1) return false
  const colgroup = ctx.table.querySelector("colgroup")
  if (colgroup?.children[ctx.colIndex]) {
    colgroup.children[ctx.colIndex].remove()
  }
  Array.from(ctx.table.rows).forEach((row) => {
    row.deleteCell(ctx.colIndex)
  })
  return true
}

export function insertRichTextTableCell(
  ctx: RichTextTableContext,
  position: "before" | "after",
): void {
  const idx = position === "before" ? ctx.colIndex : ctx.colIndex + 1
  const cell = ctx.row.insertCell(idx)
  applyRichTextTableCellDefaults(cell)
}

export function deleteRichTextTableCell(ctx: RichTextTableContext): boolean {
  if (ctx.row.cells.length <= 1) {
    return deleteRichTextTableRow(ctx)
  }
  ctx.cell.remove()
  return true
}

export function canMergeCellsRight(ctx: RichTextTableContext): boolean {
  return ctx.colIndex < ctx.row.cells.length - 1
}

export function canMergeCellsLeft(ctx: RichTextTableContext): boolean {
  return ctx.colIndex > 0
}

export function mergeRichTextTableCellsRight(ctx: RichTextTableContext): boolean {
  const next = ctx.row.cells[ctx.colIndex + 1] as HTMLTableCellElement | undefined
  if (!next) return false
  const span = ctx.cell.colSpan || 1
  const nextSpan = next.colSpan || 1
  ctx.cell.colSpan = span + nextSpan
  if (next.innerHTML.trim() && next.innerHTML !== "&nbsp;") {
    ctx.cell.innerHTML = `${ctx.cell.innerHTML} ${next.innerHTML}`
  }
  next.remove()
  return true
}

export function mergeRichTextTableCellsLeft(ctx: RichTextTableContext): boolean {
  const prev = ctx.row.cells[ctx.colIndex - 1] as HTMLTableCellElement | undefined
  if (!prev) return false
  const prevSpan = prev.colSpan || 1
  const span = ctx.cell.colSpan || 1
  prev.colSpan = prevSpan + span
  if (ctx.cell.innerHTML.trim() && ctx.cell.innerHTML !== "&nbsp;") {
    prev.innerHTML = `${prev.innerHTML} ${ctx.cell.innerHTML}`
  }
  ctx.cell.remove()
  return true
}

export function mergeRichTextTableCells(ctx: RichTextTableContext): boolean {
  if (canMergeCellsRight(ctx)) return mergeRichTextTableCellsRight(ctx)
  if (canMergeCellsLeft(ctx)) return mergeRichTextTableCellsLeft(ctx)
  return false
}

export function mergeRichTextTableCellSelection(
  root: HTMLElement | null,
): boolean {
  const hit = findTableWithCellSelection(root)
  if (!hit) return false
  return mergeTableCellRange(hit.table, hit.range)
}

export function mergeTableCellRange(
  table: HTMLTableElement,
  range: CellRange,
): boolean {
  const collected = collectCellsInRange(table, range)
  if (!collected) return false

  const { norm, anchors, topLeft } = collected
  const parts: string[] = []

  for (const cell of anchors) {
    const html = cell.innerHTML.trim()
    if (html && html !== "&nbsp;") parts.push(html)
  }

  for (const cell of anchors) {
    if (cell !== topLeft) cell.remove()
  }

  topLeft.rowSpan = norm.endRow - norm.startRow + 1
  topLeft.colSpan = norm.endCol - norm.startCol + 1
  topLeft.innerHTML = parts.length > 0 ? parts.join(" ") : "&nbsp;"
  applyRichTextTableCellDefaults(topLeft)
  clearTableCellSelection(table)
  return true
}

export {
  canMergeTableCellRange,
  clearTableCellSelection,
  findTableWithCellSelection,
  getTableCellSelection,
}

/** 수평 나누기 — 셀을 좌우 2칸으로 */
export function splitRichTextTableCellHorizontal(
  ctx: RichTextTableContext,
): boolean {
  const colspan = ctx.cell.colSpan || 1
  if (colspan > 1) {
    ctx.cell.colSpan = colspan - 1
    const cell = ctx.row.insertCell(ctx.colIndex + 1)
    applyRichTextTableCellDefaults(cell)
    return true
  }
  const cell = ctx.row.insertCell(ctx.colIndex + 1)
  applyRichTextTableCellDefaults(cell)
  return true
}

/** 수직 나누기 — 아래에 행 추가 */
export function splitRichTextTableCellVertical(
  ctx: RichTextTableContext,
): boolean {
  const rowspan = ctx.cell.rowSpan || 1
  if (rowspan > 1) {
    ctx.cell.rowSpan = rowspan - 1
  }
  const colCount = ctx.row.cells.length
  const newRow = ctx.table.insertRow(ctx.rowIndex + 1)
  for (let i = 0; i < colCount; i++) {
    applyRichTextTableCellDefaults(newRow.insertCell(i))
  }
  return true
}

export function setRichTextTableColumnWidth(
  table: HTMLTableElement,
  colIndex: number,
  widthPx: number,
): void {
  ensureTableStructure(table)
  const colgroup = table.querySelector("colgroup")
  if (!colgroup) return
  const col = colgroup.children[colIndex] as HTMLTableColElement | undefined
  if (col) col.style.width = `${Math.max(40, widthPx)}px`
}

export function setRichTextTableRowHeight(
  table: HTMLTableElement,
  rowIndex: number,
  heightPx: number,
): void {
  const row = table.rows[rowIndex]
  if (!row) return
  const height = `${Math.max(28, heightPx)}px`
  row.style.height = height
  row.style.minHeight = height
  Array.from(row.cells).forEach((cell) => {
    cell.style.height = height
    cell.style.minHeight = height
  })
}

const MIN_COL_WIDTH_PX = 48
const MIN_ROW_HEIGHT_PX = 28

function startPointerDrag(
  e: MouseEvent,
  axis: "x" | "y",
  onDrag: (delta: number) => void,
  onEnd?: () => void,
  activeHandle?: HTMLElement,
) {
  e.preventDefault()
  e.stopPropagation()
  const start = axis === "x" ? e.clientX : e.clientY
  const cursor = axis === "x" ? "col-resize" : "row-resize"
  document.body.classList.add("bp-rt-table-resizing")
  if (axis === "y") {
    document.body.classList.add("bp-rt-table-resizing--row")
  }
  document.body.style.cursor = cursor
  document.body.style.userSelect = "none"
  activeHandle?.classList.add("bp-rt-resize-active")

  const onMove = (ev: MouseEvent) => {
    const delta = (axis === "x" ? ev.clientX : ev.clientY) - start
    onDrag(delta)
  }

  const onUp = () => {
    document.removeEventListener("mousemove", onMove)
    document.removeEventListener("mouseup", onUp)
    document.body.classList.remove("bp-rt-table-resizing")
    document.body.classList.remove("bp-rt-table-resizing--row")
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    activeHandle?.classList.remove("bp-rt-resize-active")
    onEnd?.()
  }

  document.addEventListener("mousemove", onMove)
  document.addEventListener("mouseup", onUp)
}

function readColWidthPx(
  table: HTMLTableElement,
  colIndex: number,
  map: ReturnType<typeof buildTableGridMap>,
): number {
  const colgroup = table.querySelector("colgroup")
  const col = colgroup?.children[colIndex] as HTMLTableColElement | undefined
  const fromStyle = col?.style.width
  if (fromStyle?.endsWith("px")) {
    return parseFloat(fromStyle)
  }
  const cell = map.grid[0]?.[colIndex]
  return cell?.getBoundingClientRect().width ?? MIN_COL_WIDTH_PX
}

/** % 너비를 현재 렌더 크기(px)로 고정 — 드래그 조절 전에 호출 */
function materializeColWidthsPx(table: HTMLTableElement): void {
  ensureTableStructure(table)
  const map = buildTableGridMap(table)
  const colgroup = table.querySelector("colgroup")
  if (!colgroup) return

  for (let c = 0; c < map.cols; c++) {
    const width = readColWidthPx(table, c, map)
    const col = colgroup.children[c] as HTMLTableColElement | undefined
    if (col && width > 0) {
      col.style.width = `${Math.round(width)}px`
    }
  }

  const tableWidth = Math.round(table.getBoundingClientRect().width)
  if (tableWidth > 0) {
    table.style.width = `${tableWidth}px`
    table.style.maxWidth = "100%"
  }
}

function attachColumnResizeHandle(
  table: HTMLTableElement,
  cell: HTMLTableCellElement,
  targetColIndex: number,
  onTableChange?: () => void,
  onBeforeTableMutation?: () => void,
) {
  if (cell.querySelector(":scope > .bp-rt-col-resize")) return

  const handle = document.createElement("div")
  handle.className = "bp-rt-col-resize"
  handle.title = "열 너비 조절 (드래그)"
  handle.setAttribute("contenteditable", "false")
  handle.addEventListener("mousedown", (e) => {
    onBeforeTableMutation?.()
    materializeColWidthsPx(table)
    const map = buildTableGridMap(table)
    const startWidths = Array.from({ length: map.cols }, (_, i) =>
      readColWidthPx(table, i, map),
    )
    const colIndex = targetColIndex

    startPointerDrag(
      e,
      "x",
      (delta) => {
        const currentStart = startWidths[colIndex]!
        const proposed = Math.max(MIN_COL_WIDTH_PX, currentStart + delta)

        if (colIndex + 1 < map.cols) {
          const neighborStart = startWidths[colIndex + 1]!
          const diff = proposed - currentStart
          const neighborNext = Math.max(
            MIN_COL_WIDTH_PX,
            neighborStart - diff,
          )
          const actualDiff = neighborStart - neighborNext
          setRichTextTableColumnWidth(
            table,
            colIndex,
            currentStart + actualDiff,
          )
          setRichTextTableColumnWidth(table, colIndex + 1, neighborNext)
        } else {
          setRichTextTableColumnWidth(table, colIndex, proposed)
        }
      },
      onTableChange,
      handle,
    )
  })

  cell.appendChild(handle)
}

function attachRowResizeHandle(
  table: HTMLTableElement,
  cell: HTMLTableCellElement,
  targetRowIndex: number,
  onTableChange?: () => void,
  onBeforeTableMutation?: () => void,
) {
  if (cell.querySelector(":scope > .bp-rt-row-resize")) return

  const handle = document.createElement("div")
  handle.className = "bp-rt-row-resize"
  handle.title = "행 높이 조절 (드래그)"
  handle.setAttribute("contenteditable", "false")
  handle.addEventListener("mousedown", (e) => {
    onBeforeTableMutation?.()
    const row = table.rows[targetRowIndex]
    if (!row) return
    const startHeight = row.getBoundingClientRect().height

    startPointerDrag(
      e,
      "y",
      (delta) => {
        setRichTextTableRowHeight(
          table,
          targetRowIndex,
          startHeight + delta,
        )
      },
      onTableChange,
      handle,
    )
  })

  cell.appendChild(handle)
}

function attachTableResizeHandles(
  table: HTMLTableElement,
  onTableChange?: () => void,
  onBeforeTableMutation?: () => void,
) {
  const map = buildTableGridMap(table)
  const seenCol = new Set<number>()
  const seenRow = new Set<number>()

  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const cell = map.grid[r]?.[c]
      if (!cell) continue
      const bounds = map.bounds.get(cell)
      if (!bounds) continue
      if (map.grid[bounds.minR]?.[bounds.minC] !== cell) continue

      if (!seenCol.has(bounds.maxC)) {
        seenCol.add(bounds.maxC)
        attachColumnResizeHandle(
          table,
          cell,
          bounds.maxC,
          onTableChange,
          onBeforeTableMutation,
        )
      }
      if (!seenRow.has(bounds.maxR)) {
        seenRow.add(bounds.maxR)
        attachRowResizeHandle(
          table,
          cell,
          bounds.maxR,
          onTableChange,
          onBeforeTableMutation,
        )
      }
    }
  }
}

export function enhanceAllTablesInEditor(
  root: HTMLElement,
  onTableChange?: () => void,
  onBeforeTableMutation?: () => void,
): void {
  root.querySelectorAll("table").forEach((table) => {
    if (!(table instanceof HTMLTableElement)) return
    ensureTableStructure(table)
    attachTableResizeHandles(table, onTableChange, onBeforeTableMutation)
  })
  refreshAllTableCellSelectionVisuals(root)
}

export type RichTextTableCellHit = {
  table: HTMLTableElement
  cell: HTMLTableCellElement
}

export function getRichTextTableCellFromSelection(
  root: HTMLElement | null,
): RichTextTableCellHit | null {
  const sel = window.getSelection()
  if (!root || !sel?.rangeCount) return null

  let node: Node | null = sel.anchorNode
  while (node && node !== root) {
    if (node instanceof HTMLTableCellElement) {
      const table = node.closest("table")
      if (table instanceof HTMLTableElement && root.contains(table)) {
        return { table, cell: node }
      }
    }
    node = node.parentNode
  }
  return null
}

export function focusRichTextTableCell(cell: HTMLTableCellElement): void {
  applyRichTextTableCellDefaults(cell)
  cell.focus({ preventScroll: true })
  const range = document.createRange()
  range.selectNodeContents(cell)
  range.collapse(true)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  markRichTextTableCellEditing(cell)
}

/** 더블클릭·클릭 위치에 커서를 두고 셀 안에서 입력 가능하게 */
export function focusRichTextTableCellAtPoint(
  cell: HTMLTableCellElement,
  clientX: number,
  clientY: number,
): void {
  applyRichTextTableCellDefaults(cell)
  cell.focus({ preventScroll: true })

  const sel = window.getSelection()
  if (!sel) return

  const doc = cell.ownerDocument
  let range: Range | null = null

  if (typeof doc.caretRangeFromPoint === "function") {
    range = doc.caretRangeFromPoint(clientX, clientY)
  } else {
    const caretPositionFromPoint = (
      doc as Document & {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null
      }
    ).caretPositionFromPoint
    if (caretPositionFromPoint) {
      const pos = caretPositionFromPoint(clientX, clientY)
      if (pos) {
        range = doc.createRange()
        range.setStart(pos.offsetNode, pos.offset)
        range.collapse(true)
      }
    }
  }

  if (range && cell.contains(range.startContainer)) {
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    const fallback = document.createRange()
    fallback.selectNodeContents(cell)
    fallback.collapse(true)
    sel.removeAllRanges()
    sel.addRange(fallback)
  }

  markRichTextTableCellEditing(cell)
}

export function clearRichTextTableCellEditing(root: HTMLElement): void {
  root.querySelectorAll(".bp-rt-cell-editing").forEach((el) => {
    el.classList.remove("bp-rt-cell-editing")
  })
}

export function markRichTextTableCellEditing(cell: HTMLTableCellElement): void {
  const table = cell.closest("table")
  table
    ?.querySelectorAll(".bp-rt-cell-editing")
    .forEach((el) => {
      if (el !== cell) el.classList.remove("bp-rt-cell-editing")
    })
  cell.classList.add("bp-rt-cell-editing")
}

/** Tab / Shift+Tab — 표 안에서만 다음·이전 셀로 이동 (페이지 탭 전환 방지) */
export function moveRichTextTableTabFocus(
  root: HTMLElement,
  backward: boolean,
): boolean {
  const hit = getRichTextTableCellFromSelection(root)
  if (!hit) return false

  const map = buildTableGridMap(hit.table)
  const bounds = getCellBounds(hit.table, hit.cell)
  if (!bounds) return false

  const total = map.rows * map.cols
  let idx = bounds.minR * map.cols + bounds.minC + (backward ? -1 : 1)

  for (let step = 0; step < total; step++) {
    if (idx >= total) idx = 0
    if (idx < 0) idx = total - 1

    const r = Math.floor(idx / map.cols)
    const c = idx % map.cols
    const cell = map.grid[r]?.[c]
    if (!cell) {
      idx += backward ? -1 : 1
      continue
    }

    const anchor = map.bounds.get(cell)
    if (!anchor) {
      idx += backward ? -1 : 1
      continue
    }

    const isAnchor = anchor.minR === r && anchor.minC === c
    const isDifferent =
      anchor.minR !== bounds.minR || anchor.minC !== bounds.minC

    if (isAnchor && isDifferent) {
      focusRichTextTableCell(cell)
      setTableCellSelection(hit.table, {
        startRow: anchor.minR,
        startCol: anchor.minC,
        endRow: anchor.minR,
        endCol: anchor.minC,
      })
      return true
    }

    idx += backward ? -1 : 1
  }

  return false
}
