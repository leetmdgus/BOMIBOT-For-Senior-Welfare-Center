"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Table2,
  Eraser,
  Image,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  Link2Off,
  List,
  ListOrdered,
  Paintbrush,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ColorPaletteButton } from "@/components/kanban/task-detail/rich-text-color-palette"
import { RichTextTableContextMenuLayer } from "@/components/kanban/task-detail/rich-text-table-context-menu"
import { RichTextTableSelectionLayer } from "@/components/kanban/task-detail/rich-text-table-selection-layer"
import { RichTextTableStyleToolbar } from "@/components/kanban/task-detail/rich-text-table-style-toolbar"
import { TableInsertGrid } from "@/components/kanban/task-detail/table-insert-grid"
import {
  buildTableHtml,
  deleteRichTextTable,
  deleteRichTextTableCell,
  deleteRichTextTableColumn,
  deleteRichTextTableRow,
  canMergeTableCellRange,
  enhanceAllTablesInEditor,
  findTableWithCellSelection,
  getRichTextTableContext,
  insertRichTextTable,
  mergeRichTextTableCellSelection,
  insertRichTextTableCell,
  insertRichTextTableColumn,
  insertRichTextTableRow,
  mergeRichTextTableCells,
  mergeRichTextTableCellsLeft,
  mergeRichTextTableCellsRight,
  splitRichTextTableCellHorizontal,
  splitRichTextTableCellVertical,
} from "@/lib/rich-text-table-utils"
import {
  applyRichTextFontSizePx,
  HANGUL_FONT_SIZES_PX,
  parseFontSizePx,
} from "@/lib/rich-text-font-size"
import { cn } from "@/lib/utils"

export type RichTextToolbarVariant = "compact" | "full"

export type RichTextEditorHandle = {
  exec: (command: string, valueArg?: string) => void
  insertHtml: (html: string) => void
  focus: () => void
  toggleSource: () => void
  isSourceMode: boolean
  hasTableContext: () => boolean
  getTableContext: () => ReturnType<typeof getRichTextTableContext>
  insertTable: (rows: number, cols: number) => void
  deleteTable: () => boolean
  insertTableRow: (position: "before" | "after") => boolean
  deleteTableRow: () => boolean
  insertTableColumn: (position: "before" | "after") => boolean
  deleteTableColumn: () => boolean
  insertTableCell: (position: "before" | "after") => boolean
  deleteTableCell: () => boolean
  mergeTableCells: () => boolean
  mergeTableCellsRight: () => boolean
  mergeTableCellsLeft: () => boolean
  splitTableCellHorizontal: () => boolean
  splitTableCellVertical: () => boolean
  hasCellSelection: () => boolean
  canMergeCellSelection: () => boolean
  applyTableCellFill: (color: string | null) => boolean
  applyTableBorder: (border: TableBorderStyle) => boolean
  applyTableBorderWhole: (border: TableBorderStyle) => boolean
}

type BusinessPlanRichTextProps = {
  value: string
  onChange: (html: string) => void
  readOnly?: boolean
  variant?: RichTextToolbarVariant
  /** false면 블록 상단 공용 툴바 사용 */
  inlineToolbar?: boolean
  minHeight?: number
  className?: string
  onActivate?: () => void
}

export function plainTextToHtml(text: string): string {
  if (!text.trim()) return ""
  if (/^\s*</.test(text)) return text
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map(escapeHtml).join("<br>")
      return `<p>${lines}</p>`
    })
    .join("")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export const BusinessPlanRichText = forwardRef<
  RichTextEditorHandle,
  BusinessPlanRichTextProps
>(function BusinessPlanRichText(
  {
    value,
    onChange,
    readOnly = false,
    variant = "compact",
    inlineToolbar = true,
    minHeight = 140,
    className,
    onActivate,
  },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [editorDom, setEditorDom] = useState<HTMLDivElement | null>(null)
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceHtml, setSourceHtml] = useState("")
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false)
  const [, setTableSelectionTick] = useState(0)
  const lastEmitted = useRef("")
  const mounted = useRef(false)
  const editorId = useId()

  const bindEditorRef = (el: HTMLDivElement | null) => {
    editorRef.current = el
    setEditorDom(el)
  }

  const syncFromValue = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = plainTextToHtml(value)
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
    lastEmitted.current = html
    enhanceAllTablesInEditor(el)
  }, [value])

  useEffect(() => {
    if (sourceMode || readOnly) return
    if (!mounted.current) {
      mounted.current = true
      syncFromValue()
      return
    }
    if (value === lastEmitted.current) return
    syncFromValue()
  }, [value, sourceMode, readOnly, syncFromValue])

  const emitChange = () => {
    const el = editorRef.current
    if (!el) return
    const persist = () => {
      const html = el.innerHTML
      lastEmitted.current = html
      onChange(html)
    }
    enhanceAllTablesInEditor(el, persist)
    persist()
  }

  const withTableCtx = <T,>(fn: (ctx: NonNullable<ReturnType<typeof getRichTextTableContext>>) => T): T | false => {
    const ctx = getRichTextTableContext(editorRef.current)
    if (!ctx) return false
    const result = fn(ctx)
    emitChange()
    return result
  }

  const exec = (command: string, valueArg?: string) => {
    const el = editorRef.current
    if (!el) return
    if (command === "fontSize") {
      const px = parseFontSizePx(valueArg)
      if (px != null) {
        applyRichTextFontSizePx(el, px)
        emitChange()
        return
      }
    }
    el.focus()
    document.execCommand(command, false, valueArg)
    emitChange()
  }

  const insertHtml = (html: string) => {
    editorRef.current?.focus()
    document.execCommand("insertHTML", false, html)
    emitChange()
  }

  const getTableCtx = () =>
    getRichTextTableContext(editorRef.current)

  const insertTable = (rows: number, cols: number) => {
    const el = editorRef.current
    if (!el) return
    insertRichTextTable(el, rows, cols)
    emitChange()
  }

  const deleteTable = () => {
    const ctx = getTableCtx()
    if (!ctx) return false
    deleteRichTextTable(ctx.table)
    emitChange()
    return true
  }

  const insertTableRow = (position: "before" | "after") => {
    const ctx = getTableCtx()
    if (!ctx) return false
    insertRichTextTableRow(ctx, position)
    emitChange()
    return true
  }

  const deleteTableRow = () => {
    const ctx = getTableCtx()
    if (!ctx) return false
    const ok = deleteRichTextTableRow(ctx)
    if (ok) emitChange()
    return ok
  }

  const insertTableColumn = (position: "before" | "after") => {
    const ctx = getTableCtx()
    if (!ctx) return false
    insertRichTextTableColumn(ctx, position)
    emitChange()
    return true
  }

  const deleteTableColumn = () => {
    const ctx = getTableCtx()
    if (!ctx) return false
    const ok = deleteRichTextTableColumn(ctx)
    if (ok) emitChange()
    return ok
  }

  const handleSourceToggle = () => {
    if (!sourceMode) {
      setSourceHtml(editorRef.current?.innerHTML ?? plainTextToHtml(value))
      setSourceMode(true)
      queueMicrotask(() => onActivate?.())
      return
    }
    const el = editorRef.current
    if (el) {
      el.innerHTML = sourceHtml
      onChange(sourceHtml)
    }
    setSourceMode(false)
    queueMicrotask(() => onActivate?.())
  }

  const handleSourceChange = (html: string) => {
    setSourceHtml(html)
    onChange(html)
  }

  const editorApiRef = useRef<RichTextEditorHandle | null>(null)
  if (!editorApiRef.current) {
    editorApiRef.current = {
      exec: () => {},
      insertHtml: () => {},
      focus: () => {},
      toggleSource: () => {},
      isSourceMode: false,
      hasTableContext: () => false,
      getTableContext: () => null,
      insertTable: () => {},
      deleteTable: () => false,
      insertTableRow: () => false,
      deleteTableRow: () => false,
      insertTableColumn: () => false,
      deleteTableColumn: () => false,
      insertTableCell: () => false,
      deleteTableCell: () => false,
      mergeTableCells: () => false,
      mergeTableCellsRight: () => false,
      mergeTableCellsLeft: () => false,
      splitTableCellHorizontal: () => false,
      splitTableCellVertical: () => false,
      hasCellSelection: () => false,
      canMergeCellSelection: () => false,
      applyTableCellFill: () => false,
      applyTableBorder: () => false,
      applyTableBorderWhole: () => false,
    }
  }

  const api = editorApiRef.current
  api.exec = exec
  api.insertHtml = insertHtml
  api.focus = () => editorRef.current?.focus()
  api.toggleSource = handleSourceToggle
  api.isSourceMode = sourceMode
  api.hasTableContext = () => Boolean(getTableCtx())
  api.getTableContext = () => getRichTextTableContext(editorRef.current)
  api.insertTable = insertTable
  api.deleteTable = deleteTable
  api.insertTableRow = insertTableRow
  api.deleteTableRow = deleteTableRow
  api.insertTableColumn = insertTableColumn
  api.deleteTableColumn = deleteTableColumn
  api.insertTableCell = (position) =>
    withTableCtx((ctx) => insertRichTextTableCell(ctx, position)) !== false
  api.deleteTableCell = () =>
    withTableCtx((ctx) => deleteRichTextTableCell(ctx)) !== false
  api.mergeTableCellsRight = () =>
    withTableCtx((ctx) => mergeRichTextTableCellsRight(ctx)) !== false
  api.mergeTableCellsLeft = () =>
    withTableCtx((ctx) => mergeRichTextTableCellsLeft(ctx)) !== false
  api.splitTableCellHorizontal = () =>
    withTableCtx((ctx) => splitRichTextTableCellHorizontal(ctx)) !== false
  api.splitTableCellVertical = () =>
    withTableCtx((ctx) => splitRichTextTableCellVertical(ctx)) !== false
  api.hasCellSelection = () =>
    Boolean(findTableWithCellSelection(editorRef.current))
  api.canMergeCellSelection = () => {
    const hit = findTableWithCellSelection(editorRef.current)
    if (!hit) return false
    return canMergeTableCellRange(hit.table, hit.range)
  }
  api.mergeTableCells = () => {
    if (mergeRichTextTableCellSelection(editorRef.current)) {
      emitChange()
      return true
    }
    return withTableCtx((ctx) => mergeRichTextTableCells(ctx)) !== false
  }
  api.applyTableCellFill = (color) => {
    const ok = applyTableStyleFromEditor(editorRef.current, getTableCtx(), {
      type: "fill",
      color,
    })
    if (ok) emitChange()
    return ok
  }
  api.applyTableBorder = (border) => {
    const ok = applyTableStyleFromEditor(editorRef.current, getTableCtx(), {
      type: "border",
      border,
    })
    if (ok) emitChange()
    return ok
  }
  api.applyTableBorderWhole = (border) => {
    const ctx = getTableCtx()
    if (!ctx) return false
    applyWholeTableBorderStyle(ctx.table, border)
    emitChange()
    return true
  }

  useImperativeHandle(ref, () => api, [])

  useEffect(() => {
    if (readOnly || sourceMode) return
    const el = editorRef.current
    if (!el) return
    enhanceAllTablesInEditor(el, () => {
      lastEmitted.current = el.innerHTML
    })
  }, [value, readOnly, sourceMode])

  useEffect(() => {
    const el = editorDom
    if (!el) return
    const bump = () => setTableSelectionTick((n) => n + 1)
    el.addEventListener("bp-rt-table-selection-change", bump)
    return () => el.removeEventListener("bp-rt-table-selection-change", bump)
  }, [editorDom])

  if (readOnly) {
    const html = plainTextToHtml(value)
    return (
      <div
        className={cn(
          "bp-rich-editor formal-doc prose prose-sm max-w-none text-sm leading-relaxed",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  const showInlineToolbar = inlineToolbar && !readOnly

  return (
    <div
      className={cn(
        "bp-rich-root w-full min-w-0 overflow-hidden rounded-lg border border-gray-200 print:border-0 print:shadow-none",
        className,
      )}
    >
      {showInlineToolbar && !toolbarCollapsed && variant === "compact" ? (
        <div className="print-hide">
          <CompactToolbar onExec={exec} onInsertHtml={insertHtml} />
        </div>
      ) : null}
      {showInlineToolbar && !toolbarCollapsed && variant === "full" ? (
        <div className="print-hide">
          <FullToolbar
            onExec={exec}
            onInsertHtml={insertHtml}
            onSourceToggle={handleSourceToggle}
            sourceMode={sourceMode}
            editor={{
              exec,
              insertHtml,
              focus: () => editorRef.current?.focus(),
              toggleSource: handleSourceToggle,
              isSourceMode: sourceMode,
              hasTableContext: () =>
                Boolean(getRichTextTableContext(editorRef.current)),
              insertTable,
              deleteTable,
              insertTableRow,
              deleteTableRow,
              insertTableColumn,
              deleteTableColumn,
            }}
          />
        </div>
      ) : null}

      {sourceMode ? (
        <textarea
          id={editorId}
          value={sourceHtml}
          onChange={(e) => handleSourceChange(e.target.value)}
          onFocus={() => onActivate?.()}
          className="print-hide min-h-[160px] w-full resize-y border-0 bg-white p-4 font-mono text-xs leading-relaxed outline-none"
          spellCheck={false}
        />
      ) : (
        <>
          <div
            ref={bindEditorRef}
            id={editorId}
            contentEditable
            suppressContentEditableWarning
            onInput={emitChange}
            onBlur={emitChange}
            onFocus={() => onActivate?.()}
            onClick={() => onActivate?.()}
            className="bp-rich-editor formal-doc min-h-[12rem] w-full min-w-0 px-3 py-3 text-[11px] leading-relaxed outline-none"
            style={{ minHeight }}
            data-placeholder="내용을 입력하세요. 표 셀 오른쪽·아래 가장자리를 드래그하면 열 너비·행 높이를 조절할 수 있습니다."
          />
          <RichTextTableSelectionLayer
            editorRoot={editorDom}
            onChange={emitChange}
          />
          <RichTextTableContextMenuLayer
            editorRoot={editorDom}
            onChange={emitChange}
          />
        </>
      )}

      {variant === "full" ? (
        <div className="print-hide flex justify-end border-t border-gray-100 bg-gray-50 px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => setToolbarCollapsed((v) => !v)}
          >
            {toolbarCollapsed ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronUp className="size-3.5" />
            )}
            툴바 {toolbarCollapsed ? "펼치기" : "접기"}
          </Button>
        </div>
      ) : null}
    </div>
  )
})

BusinessPlanRichText.displayName = "BusinessPlanRichText"

function ToolbarButton({
  title,
  onClick,
  active,
  disabled,
  children,
  className,
  label,
}: {
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
  /** 세로 툴바에서 아이콘 아래 짧은 라벨 */
  label?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "bp-toolbar-btn gap-1 text-xs font-medium text-slate-700 hover:bg-slate-200/90 hover:text-slate-900",
        label
          ? "h-auto min-h-9 flex-col px-1 py-1.5"
          : "h-8 min-w-8 px-1.5",
        active && "bg-primary/10 text-primary ring-1 ring-primary/20",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      {children}
      {label ? (
        <span className="max-w-full truncate text-[9px] font-normal leading-none text-muted-foreground">
          {label}
        </span>
      ) : null}
    </Button>
  )
}

export type ToolbarOrientation = "horizontal" | "vertical"

function ToolbarDivider({ orientation = "horizontal" }: { orientation?: ToolbarOrientation }) {
  return (
    <span
      className={cn(
        "bp-toolbar-divider shrink-0 bg-slate-200",
        orientation === "vertical"
          ? "my-0.5 block h-px w-full"
          : "mx-1 h-6 w-px self-center",
      )}
      aria-hidden
    />
  )
}

function ToolbarSection({
  label,
  orientation,
  children,
  action,
  className,
}: {
  label: string
  orientation: ToolbarOrientation
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const vertical = orientation === "vertical"
  return (
    <section
      className={cn(
        vertical
          ? "rounded-lg border border-slate-200/80 bg-white/80 p-2 shadow-sm"
          : "flex min-w-0 shrink-0 flex-col px-2.5 py-1.5 first:pl-3 last:pr-3",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span
          className={cn(
            "font-semibold text-slate-500",
            vertical ? "text-[10px] uppercase tracking-wider" : "text-[11px]",
          )}
        >
          {label}
        </span>
        {action}
      </div>
      <div>{children}</div>
    </section>
  )
}

function ToolbarIconGrid({
  orientation,
  children,
  columns = 2,
}: {
  orientation: ToolbarOrientation
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 6
}) {
  const colClass =
    columns === 6
      ? "grid-cols-6"
      : columns === 4
        ? "grid-cols-4"
        : columns === 3
          ? "grid-cols-3"
          : "grid-cols-2"

  return (
    <div
      className={cn(
        orientation === "vertical"
          ? cn("grid gap-0.5", colClass)
          : "flex flex-wrap gap-0.5",
      )}
    >
      {children}
    </div>
  )
}

export function CompactToolbar({
  onExec,
  onInsertHtml,
  orientation = "horizontal",
}: {
  onExec: (cmd: string, val?: string) => void
  onInsertHtml: (html: string) => void
  orientation?: ToolbarOrientation
}) {
  const vertical = orientation === "vertical"

  if (!vertical) {
    return (
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/90 px-2 py-1.5">
        <ToolbarButton title="실행 취소" onClick={() => onExec("undo")}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton title="다시 실행" onClick={() => onExec("redo")}>
          <Redo2 className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton title="굵게" onClick={() => onExec("bold")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton title="기울임" onClick={() => onExec("italic")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton title="밑줄" onClick={() => onExec("underline")}>
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton title="취소선" onClick={() => onExec("strikeThrough")}>
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton title="번호 목록" onClick={() => onExec("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton title="글머리 목록" onClick={() => onExec("insertUnorderedList")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="가. 목록"
          onClick={() =>
            onInsertHtml('<ol class="list-hangul"><li>항목</li></ol>')
          }
        >
          <span className="text-xs font-semibold">가.</span>
        </ToolbarButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <ToolbarSection label="실행" orientation={orientation}>
        <ToolbarIconGrid orientation={orientation} columns={2}>
          <ToolbarButton title="실행 취소" label="취소" onClick={() => onExec("undo")}>
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton title="다시 실행" label="다시" onClick={() => onExec("redo")}>
            <Redo2 className="size-4" />
          </ToolbarButton>
        </ToolbarIconGrid>
      </ToolbarSection>

      <ToolbarSection label="서식" orientation={orientation}>
        <ToolbarIconGrid orientation={orientation} columns={2}>
          <ToolbarButton title="굵게" label="굵게" onClick={() => onExec("bold")}>
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton title="기울임" label="기울임" onClick={() => onExec("italic")}>
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton title="밑줄" label="밑줄" onClick={() => onExec("underline")}>
            <Underline className="size-4" />
          </ToolbarButton>
          <ToolbarButton title="취소선" label="취소선" onClick={() => onExec("strikeThrough")}>
            <Strikethrough className="size-4" />
          </ToolbarButton>
        </ToolbarIconGrid>
      </ToolbarSection>

      <ToolbarSection label="목록" orientation={orientation}>
        <ToolbarIconGrid orientation={orientation} columns={3}>
          <ToolbarButton title="번호 목록" label="1." onClick={() => onExec("insertOrderedList")}>
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton title="글머리" label="글머리" onClick={() => onExec("insertUnorderedList")}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title="가. 목록"
            label="가."
            onClick={() =>
              onInsertHtml('<ol class="list-hangul"><li>항목</li></ol>')
            }
          >
            <span className="text-xs font-semibold">가.</span>
          </ToolbarButton>
        </ToolbarIconGrid>
      </ToolbarSection>
    </div>
  )
}

/** 한글(한컴) 워드프로세서형 4단 툴바 */
export function HangulToolbar({
  onExec,
  onInsertHtml,
  onSourceToggle,
  sourceMode,
  editor,
  orientation = "horizontal",
}: {
  onExec: (cmd: string, val?: string) => void
  onInsertHtml: (html: string) => void
  onSourceToggle: () => void
  sourceMode: boolean
  editor?: RichTextEditorHandle | null
  orientation?: ToolbarOrientation
}) {
  const [tableToolsExpanded, setTableToolsExpanded] = useState(false)
  const inTable = editor?.hasTableContext() ?? false
  const canStyleTable =
    inTable || (editor?.hasCellSelection?.() ?? false)
  const vertical = orientation === "vertical"
  const lbl = (text: string) => (vertical ? text : undefined)

  const tableToggle = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 gap-0.5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
      title={tableToolsExpanded ? "표 도구 접기" : "표 도구 펼치기"}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setTableToolsExpanded((v) => !v)}
    >
      {tableToolsExpanded ? (
        <ChevronUp className="size-3" />
      ) : (
        <ChevronDown className="size-3" />
      )}
    </Button>
  )

  return (
    <div
      className={cn(
        "bp-hangul-toolbar",
        vertical
          ? "flex flex-col gap-2 bg-slate-50/95 p-2"
          : "border-b border-slate-200 bg-slate-50/90",
      )}
    >
      <div
        className={cn(
          vertical
            ? "flex flex-col gap-2"
            : "flex flex-wrap items-start divide-x divide-slate-200/90",
        )}
      >
        <ToolbarSection label="글꼴" orientation={orientation}>
          <div
            className={cn(
              vertical ? "flex flex-col gap-1.5" : "flex flex-wrap items-center gap-1",
            )}
          >
            <StyleSelect orientation={orientation} onExec={onExec} />
            <FormatSelect orientation={orientation} onExec={onExec} />
            <FontSelect orientation={orientation} onExec={onExec} />
            <SizeSelect orientation={orientation} onExec={onExec} />
            <div
              className={cn(
                "flex gap-0.5",
                vertical ? "justify-center pt-0.5" : "items-center",
              )}
            >
              <ColorPaletteButton
                label="글자색"
                command="foreColor"
                onExec={onExec}
                trigger={
                  <span className="text-[11px] font-bold underline decoration-red-500 decoration-2">
                    A
                  </span>
                }
              />
              <ColorPaletteButton
                label="배경색"
                command="hiliteColor"
                onExec={onExec}
                trigger={
                  <span className="rounded bg-yellow-200 px-0.5 text-[11px] font-bold">
                    A
                  </span>
                }
              />
            </div>
          </div>
        </ToolbarSection>

        <ToolbarSection label="문자" orientation={orientation}>
          <ToolbarIconGrid orientation={orientation} columns={vertical ? 2 : 4}>
            <ToolbarButton title="굵게" label="굵게" onClick={() => onExec("bold")}>
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="기울임" label="기울임" onClick={() => onExec("italic")}>
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="밑줄" label="밑줄" onClick={() => onExec("underline")}>
              <Underline className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="취소선"
              label="취소선"
              onClick={() => onExec("strikeThrough")}
            >
              <Strikethrough className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="아래첨자" label="아래" onClick={() => onExec("subscript")}>
              <Subscript className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="위첨자" label="위" onClick={() => onExec("superscript")}>
              <Superscript className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="서식 복사" label="복사" onClick={() => onExec("copy")}>
              <Paintbrush className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="서식 제거" label="지우기" onClick={() => onExec("removeFormat")}>
              <Eraser className="size-4" />
            </ToolbarButton>
          </ToolbarIconGrid>
        </ToolbarSection>

        <ToolbarSection label="단락" orientation={orientation}>
          <div className={cn(vertical ? "space-y-2" : "space-y-1.5")}>
            <ToolbarIconGrid orientation={orientation} columns={4}>
              <ToolbarButton title="왼쪽 정렬" label="왼쪽" onClick={() => onExec("justifyLeft")}>
                <AlignLeft className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                title="가운데 정렬"
                label="가운데"
                onClick={() => onExec("justifyCenter")}
              >
                <AlignCenter className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                title="오른쪽 정렬"
                label="오른쪽"
                onClick={() => onExec("justifyRight")}
              >
                <AlignRight className="size-4" />
              </ToolbarButton>
              <ToolbarButton title="양쪽 정렬" label="양쪽" onClick={() => onExec("justifyFull")}>
                <AlignJustify className="size-4" />
              </ToolbarButton>
            </ToolbarIconGrid>
            <ToolbarIconGrid orientation={orientation} columns={vertical ? 3 : 6}>
              <ToolbarButton
                title="번호 목록"
                label="1."
                onClick={() => onExec("insertOrderedList")}
              >
                <ListOrdered className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                title="글머리 목록"
                label="글머리"
                onClick={() => onExec("insertUnorderedList")}
              >
                <List className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                title="1) 형식"
                label="1)"
                onClick={() =>
                  onInsertHtml('<ol class="list-decimal-paren"><li>항목</li></ol>')
                }
              >
                <span className="text-xs font-semibold">1)</span>
              </ToolbarButton>
              <ToolbarButton
                title="가. 형식"
                label="가."
                onClick={() =>
                  onInsertHtml('<ol class="list-hangul"><li>항목</li></ol>')
                }
              >
                <span className="text-xs font-semibold">가.</span>
              </ToolbarButton>
              <ToolbarButton
                title="가) 형식"
                label="가)"
                onClick={() =>
                  onInsertHtml('<ol class="list-hangul-paren"><li>항목</li></ol>')
                }
              >
                <span className="text-xs font-semibold">가)</span>
              </ToolbarButton>
              <ToolbarButton
                title="○ 글머리"
                label="○"
                onClick={() =>
                  onInsertHtml('<ul class="list-circle"><li>항목</li></ul>')
                }
              >
                <span className="text-xs">○</span>
              </ToolbarButton>
              <ToolbarButton
                title="■ 글머리"
                label="■"
                onClick={() =>
                  onInsertHtml('<ul class="list-square"><li>항목</li></ul>')
                }
              >
                <span className="text-xs">■</span>
              </ToolbarButton>
              <ToolbarButton
                title="- 글머리"
                label="-"
                onClick={() =>
                  onInsertHtml('<ul class="list-dash"><li>항목</li></ul>')
                }
              >
                <span className="text-xs font-semibold">-</span>
              </ToolbarButton>
            </ToolbarIconGrid>
            <ToolbarIconGrid orientation={orientation} columns={2}>
              <ToolbarButton title="내어쓰기" label="내어" onClick={() => onExec("outdent")}>
                <IndentDecrease className="size-4" />
              </ToolbarButton>
              <ToolbarButton title="들여쓰기" label="들여" onClick={() => onExec("indent")}>
                <IndentIncrease className="size-4" />
              </ToolbarButton>
            </ToolbarIconGrid>
          </div>
        </ToolbarSection>

        <ToolbarSection label="편집" orientation={orientation}>
          <ToolbarIconGrid orientation={orientation} columns={vertical ? 2 : 4}>
            <ToolbarButton title="실행 취소" label="취소" onClick={() => onExec("undo")}>
              <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="다시 실행" label="다시" onClick={() => onExec("redo")}>
              <Redo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="인용"
              label="인용"
              onClick={() => onExec("formatBlock", "blockquote")}
            >
              <span className="text-xs font-medium">“</span>
            </ToolbarButton>
            <ToolbarButton title="전체 선택" label="전체" onClick={() => onExec("selectAll")}>
              <span className="text-[10px] font-medium">전체</span>
            </ToolbarButton>
            <ToolbarButton
              title="링크"
              label="링크"
              onClick={() => {
                const url = window.prompt("URL", "https://")
                if (url) onExec("createLink", url)
              }}
            >
              <Link className="size-4" />
            </ToolbarButton>
            <ToolbarButton title="링크 제거" label="해제" onClick={() => onExec("unlink")}>
              <Link2Off className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="이미지 삽입"
              label="이미지"
              onClick={() =>
                onInsertHtml(
                  '<img src="https://placehold.co/320x180?text=Image" alt="" class="max-w-full rounded" />',
                )
              }
            >
              <Image className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="구분선"
              label="구분선"
              onClick={() => onInsertHtml("<hr class='my-2 border-gray-300' />")}
            >
              <span className="text-xs text-muted-foreground">—</span>
            </ToolbarButton>
          </ToolbarIconGrid>
        </ToolbarSection>

        <ToolbarSection
          label="표"
          orientation={orientation}
          action={tableToggle}
          className={cn(!vertical && tableToolsExpanded && "min-w-[280px]")}
        >
          {tableToolsExpanded ? (
            <div className={cn("space-y-2", vertical && "pt-0.5")}>
              <div
                className={cn(
                  vertical ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-1",
                )}
              >
                <TableInsertGrid
                  disabled={sourceMode}
                  onInsert={(rows, cols) => {
                    if (editor) editor.insertTable(rows, cols)
                    else onInsertHtml(buildTableHtml(rows, cols))
                  }}
                />
              </div>
              <ToolbarIconGrid orientation={orientation} columns={vertical ? 3 : 4}>
                <ToolbarButton
                  title="표 삭제"
                  label="표삭제"
                  disabled={!inTable}
                  onClick={() => editor?.deleteTable()}
                >
                  <Table2 className="size-4 opacity-60" />
                </ToolbarButton>
                <ToolbarButton
                  title="위에 행 삽입"
                  label="행↑"
                  disabled={!inTable}
                  onClick={() => editor?.insertTableRow("before")}
                >
                  <span className="text-[10px] font-medium">행↑</span>
                </ToolbarButton>
                <ToolbarButton
                  title="아래에 행 삽입"
                  label="행↓"
                  disabled={!inTable}
                  onClick={() => editor?.insertTableRow("after")}
                >
                  <span className="text-[10px] font-medium">행↓</span>
                </ToolbarButton>
                <ToolbarButton
                  title="행 삭제"
                  label="행−"
                  disabled={!inTable}
                  onClick={() => editor?.deleteTableRow()}
                >
                  <span className="text-[10px] font-medium">행−</span>
                </ToolbarButton>
                <ToolbarButton
                  title="왼쪽에 열 삽입"
                  label="열←"
                  disabled={!inTable}
                  onClick={() => editor?.insertTableColumn("before")}
                >
                  <span className="text-[10px] font-medium">열←</span>
                </ToolbarButton>
                <ToolbarButton
                  title="오른쪽에 열 삽입"
                  label="열→"
                  disabled={!inTable}
                  onClick={() => editor?.insertTableColumn("after")}
                >
                  <span className="text-[10px] font-medium">열→</span>
                </ToolbarButton>
                <ToolbarButton
                  title="열 삭제"
                  label="열−"
                  disabled={!inTable}
                  onClick={() => editor?.deleteTableColumn()}
                >
                  <span className="text-[10px] font-medium">열−</span>
                </ToolbarButton>
                <ToolbarButton
                  title="선택 영역 병합"
                  label="병합"
                  disabled={!editor?.canMergeCellSelection?.()}
                  onClick={() => editor?.mergeTableCells()}
                >
                  <span className="text-[10px] font-medium">병합</span>
                </ToolbarButton>
                <ToolbarButton
                  title="오른쪽 합치기"
                  label="→합"
                  disabled={!inTable}
                  onClick={() => editor?.mergeTableCellsRight()}
                >
                  <span className="text-[10px] font-medium">→합</span>
                </ToolbarButton>
                <ToolbarButton
                  title="왼쪽 합치기"
                  label="←합"
                  disabled={!inTable}
                  onClick={() => editor?.mergeTableCellsLeft()}
                >
                  <span className="text-[10px] font-medium">←합</span>
                </ToolbarButton>
                <ToolbarButton
                  title="수평 나누기"
                  label="↔분할"
                  disabled={!inTable}
                  onClick={() => editor?.splitTableCellHorizontal()}
                >
                  <span className="text-[10px] font-medium">↔</span>
                </ToolbarButton>
                <ToolbarButton
                  title="수직 나누기"
                  label="↕분할"
                  disabled={!inTable}
                  onClick={() => editor?.splitTableCellVertical()}
                >
                  <span className="text-[10px] font-medium">↕</span>
                </ToolbarButton>
              </ToolbarIconGrid>
              <RichTextTableStyleToolbar
                disabled={!canStyleTable || sourceMode}
                onApplyFill={(color) => editor?.applyTableCellFill(color)}
                onApplyBorder={(border) => editor?.applyTableBorder(border)}
                onApplyBorderToWholeTable={(border) =>
                  editor?.applyTableBorderWhole(border)
                }
              />
            </div>
          ) : (
            <p className="text-[10px] leading-snug text-muted-foreground">
              {vertical
                ? "펼치면 표 삽입·행열·병합 도구를 사용할 수 있습니다."
                : "▲ 표 섹션을 펼치면 표 도구가 나타납니다."}
            </p>
          )}
        </ToolbarSection>
      </div>

      <div
        className={cn(
          "flex shrink-0",
          vertical
            ? "justify-stretch border-t border-slate-200/80 pt-2"
            : "border-t border-slate-200/80 px-2 py-1.5",
        )}
      >
        <ToolbarButton
          title="HTML 소스 보기"
          onClick={onSourceToggle}
          active={sourceMode}
          className={cn("font-semibold", vertical ? "w-full" : "ml-auto")}
          label={vertical ? "소스" : undefined}
        >
          <Code className="size-4" />
          {!vertical ? <span className="ml-1">소스</span> : null}
        </ToolbarButton>
      </div>
    </div>
  )
}

function StyleSelect({
  onExec,
  orientation = "horizontal",
}: {
  onExec: (cmd: string, val?: string) => void
  orientation?: ToolbarOrientation
}) {
  return (
    <Select
      onValueChange={(v) => {
        if (v) onExec("formatBlock", v)
      }}
    >
      <SelectTrigger
        data-toolbar-select
        className={cn(
          "h-7 border-gray-300 bg-white text-xs",
          orientation === "vertical" ? "w-full" : "w-[88px]",
        )}
      >
        <SelectValue placeholder="스타일" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="p">본문</SelectItem>
        <SelectItem value="h2">제목 1</SelectItem>
        <SelectItem value="h3">제목 2</SelectItem>
        <SelectItem value="h4">제목 3</SelectItem>
      </SelectContent>
    </Select>
  )
}

function FormatSelect({
  onExec,
  orientation = "horizontal",
}: {
  onExec: (cmd: string, val?: string) => void
  orientation?: ToolbarOrientation
}) {
  return (
    <Select
      onValueChange={(v) => {
        if (v) onExec("formatBlock", v)
      }}
    >
      <SelectTrigger
        data-toolbar-select
        className={cn(
          "h-7 border-gray-300 bg-white text-xs",
          orientation === "vertical" ? "w-full" : "w-[88px]",
        )}
      >
        <SelectValue placeholder="문단" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="p">문단</SelectItem>
        <SelectItem value="pre">코드</SelectItem>
        <SelectItem value="blockquote">인용</SelectItem>
      </SelectContent>
    </Select>
  )
}

function FontSelect({
  onExec,
  orientation = "horizontal",
}: {
  onExec: (cmd: string, val?: string) => void
  orientation?: ToolbarOrientation
}) {
  return (
    <Select
      onValueChange={(v) => onExec("fontName", v)}
    >
      <SelectTrigger
        data-toolbar-select
        className={cn(
          "h-7 border-gray-300 bg-white text-xs",
          orientation === "vertical" ? "w-full" : "w-[100px]",
        )}
      >
        <SelectValue placeholder="글꼴" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Malgun Gothic, sans-serif">맑은 고딕</SelectItem>
        <SelectItem value="Gulim, sans-serif">굴림</SelectItem>
        <SelectItem value="Dotum, sans-serif">돋움</SelectItem>
        <SelectItem value="Batang, serif">바탕</SelectItem>
        <SelectItem value="Arial, sans-serif">Arial</SelectItem>
      </SelectContent>
    </Select>
  )
}

function SizeSelect({
  onExec,
  orientation = "horizontal",
}: {
  onExec: (cmd: string, val?: string) => void
  orientation?: ToolbarOrientation
}) {
  return (
    <Select
      onValueChange={(v) => {
        if (v) onExec("fontSize", v)
      }}
    >
      <SelectTrigger
        data-toolbar-select
        className={cn(
          "h-7 border-gray-300 bg-white text-xs",
          orientation === "vertical" ? "w-full" : "w-[76px]",
        )}
      >
        <SelectValue placeholder="크기" />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {HANGUL_FONT_SIZES_PX.map((px) => (
          <SelectItem key={px} value={`${px}px`}>
            {px}px
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** @deprecated HangulToolbar 사용 */
export const FullToolbar = HangulToolbar
