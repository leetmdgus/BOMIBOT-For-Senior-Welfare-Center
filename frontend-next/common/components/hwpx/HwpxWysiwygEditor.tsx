"use client"

// HwpxWysiwygEditor.tsx — rhwp로 가져온 한글문서(frontend JSON)를 A4 페이지 그대로 그리되,
// 문서 위 텍스트/표 셀을 직접 클릭해 수정하는 WYSIWYG 편집기.
// 편집은 기존 mutator(updateRunText 등)로 frontend JSON에 반영 → rhwp writeback/export 그대로 재사용.

import { useEffect, useRef, useState, type CSSProperties } from "react"

import { cn } from "@/lib/utils"
import {
  appendImageParagraph,
  updateCellBackground,
  updateCellRunStyle,
  updateCellRunText,
  updateRunStyle,
  updateRunText,
  type HwpxFrontendDocument,
  type HwpxFrontendTable,
  type HwpxFrontendTableCell,
  type HwpxFrontendTextRun,
  type HwpxTextRunStyle,
  type TableCellPath,
} from "@/lib/hwpx/frontend-render-types"
import { HwpxFormatToolbar, normalizeColor } from "./hwpx-format-toolbar"
import {
  getMargins,
  getParagraphStyle,
  getTextRunStyle,
  hwpunitToPx,
  mapVerticalAlign,
  resolveCellBorders,
  type AnyObj,
  type RenderCtx,
  PAGE_W_MM,
} from "./hwpx-render-helpers"
import "./HwpxRenderer.css"

/** 서식/배경 툴바가 적용할 "활성(포커스된)" 위치 */
type ActiveTarget =
  | { scope: "top"; paragraphIndex: number; runIndex: number }
  | { scope: "cell"; path: TableCellPath; cellParagraphIndex: number; runIndex: number }

type HwpxWysiwygEditorProps = {
  doc: HwpxFrontendDocument
  onChange: (next: HwpxFrontendDocument) => void
  className?: string
}

function readActiveRun(
  doc: HwpxFrontendDocument,
  target: ActiveTarget | null,
): HwpxFrontendTextRun | null {
  if (!target) return null
  if (target.scope === "top") {
    const run = doc.document.paragraphs[target.paragraphIndex]?.runs?.[target.runIndex]
    return run && run.type === "text_run" ? (run as HwpxFrontendTextRun) : null
  }
  const tableRun = doc.document.paragraphs[target.path.paragraphIndex]?.runs?.[
    target.path.runIndex
  ]
  if (!tableRun || tableRun.type !== "table") return null
  for (const tableRow of (tableRun as HwpxFrontendTable).rows ?? []) {
    for (const cell of tableRow.cells ?? []) {
      if (cell.row === target.path.row && cell.col === target.path.col) {
        const run = cell.paragraphs?.[target.cellParagraphIndex]?.runs?.[target.runIndex]
        return run && run.type === "text_run" ? (run as HwpxFrontendTextRun) : null
      }
    }
  }
  return null
}

function readActiveCell(
  doc: HwpxFrontendDocument,
  target: ActiveTarget | null,
): HwpxFrontendTableCell | null {
  if (!target || target.scope !== "cell") return null
  const tableRun = doc.document.paragraphs[target.path.paragraphIndex]?.runs?.[
    target.path.runIndex
  ]
  if (!tableRun || tableRun.type !== "table") return null
  for (const tableRow of (tableRun as HwpxFrontendTable).rows ?? []) {
    for (const cell of tableRow.cells ?? []) {
      if (cell.row === target.path.row && cell.col === target.path.col) return cell
    }
  }
  return null
}

/** 커서 점프 없는 contentEditable 텍스트 — 포커스 중에는 외부 값으로 DOM을 덮어쓰지 않는다. */
function EditableText({
  value,
  style,
  className,
  onInput,
  onFocus,
}: {
  value: string
  style?: CSSProperties
  className?: string
  onInput: (text: string) => void
  onFocus: () => void
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

  return (
    <span
      ref={ref}
      role="textbox"
      aria-label="문서 텍스트 편집"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={cn("hwpx-edit-run", className)}
      style={style}
      onFocus={onFocus}
      // run은 인라인 한 줄 — Enter로 블록(<div>/<br>)이 끼어들지 않게 막는다
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault()
      }}
      // 서식 있는 붙여넣기를 평문으로 정규화 (DOM이 저장 텍스트와 어긋나지 않게)
      onPaste={(event) => {
        event.preventDefault()
        const text = event.clipboardData.getData("text/plain")
        document.execCommand("insertText", false, text)
      }}
      onInput={(event) => onInput(event.currentTarget.textContent ?? "")}
    />
  )
}

export function HwpxWysiwygEditor({ doc, onChange, className }: HwpxWysiwygEditorProps) {
  const [active, setActive] = useState<ActiveTarget | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const paragraphs = doc.document?.paragraphs ?? []
  const ctx: RenderCtx = { borderFills: (doc.maps as AnyObj)?.border_fills ?? {} }
  const margins = getMargins(doc as AnyObj)
  const lastParagraphIndex = Math.max(paragraphs.length - 1, 0)

  const activeRun = readActiveRun(doc, active)
  const activeCell = readActiveCell(doc, active)

  const applyActiveStyle = (patch: Partial<HwpxTextRunStyle>) => {
    if (!active) return
    if (active.scope === "top") {
      onChange(updateRunStyle(doc, active.paragraphIndex, active.runIndex, patch))
    } else {
      onChange(
        updateCellRunStyle(doc, active.path, active.cellParagraphIndex, active.runIndex, patch),
      )
    }
  }

  const handleInsertImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (dataUrl) onChange(appendImageParagraph(doc, lastParagraphIndex, dataUrl))
    }
    reader.readAsDataURL(file)
  }

  const pageStyle: CSSProperties = {
    width: `${PAGE_W_MM}mm`,
    minHeight: "60mm",
    paddingTop: `${margins.top}mm`,
    paddingRight: `${margins.right}mm`,
    paddingBottom: `${margins.bottom}mm`,
    paddingLeft: `${margins.left}mm`,
  }

  return (
    <div className={cn("space-y-3", className)}>
      <HwpxFormatToolbar
        style={activeRun?.style}
        disabled={!activeRun}
        onStyle={applyActiveStyle}
        onInsertImage={() => fileInputRef.current?.click()}
      />

      {activeCell ? (
        <div className="flex items-center gap-2 rounded-md border bg-card/80 px-2 py-1 text-xs text-muted-foreground">
          <span>선택한 표 셀</span>
          <input
            type="color"
            aria-label="셀 배경색"
            value={normalizeColor(activeCell.backgroundColor ?? null, "#ffffff")}
            onChange={(event) => {
              if (active?.scope === "cell") {
                onChange(updateCellBackground(doc, active.path, event.target.value))
              }
            }}
            className="h-6 w-6 cursor-pointer rounded border p-0.5"
            title="셀 배경색"
          />
          <button
            type="button"
            className="rounded border px-1.5 py-0.5 hover:bg-muted"
            onClick={() => {
              if (active?.scope === "cell") {
                onChange(updateCellBackground(doc, active.path, "none"))
              }
            }}
          >
            배경 지우기
          </button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) handleInsertImage(file)
        }}
      />

      <div className="hwpx-root">
        <div className="hwpx-page hwpx-page-editable" style={pageStyle}>
          {paragraphs.map((paragraph, paragraphIndex) => (
            <div
              key={paragraphIndex}
              className="hwpx-paragraph"
              style={getParagraphStyle(paragraph as AnyObj)}
            >
              {(paragraph.runs ?? []).length === 0
                ? "​"
                : paragraph.runs.map((run, runIndex) => {
                    if (run.type === "text_run") {
                      const textRun = run as HwpxFrontendTextRun
                      return (
                        <EditableText
                          key={`p${paragraphIndex}-r${runIndex}`}
                          value={String(textRun.text ?? "")}
                          style={getTextRunStyle(textRun as AnyObj)}
                          onFocus={() =>
                            setActive({ scope: "top", paragraphIndex, runIndex })
                          }
                          onInput={(text) =>
                            onChange(updateRunText(doc, paragraphIndex, runIndex, text))
                          }
                        />
                      )
                    }

                    if (run.type === "table") {
                      return (
                        <EditableTable
                          key={`p${paragraphIndex}-r${runIndex}`}
                          table={run as HwpxFrontendTable}
                          paragraphIndex={paragraphIndex}
                          runIndex={runIndex}
                          ctx={ctx}
                          activePath={active?.scope === "cell" ? active.path : null}
                          onCellFocus={(path, cpIdx, rIdx) =>
                            setActive({
                              scope: "cell",
                              path,
                              cellParagraphIndex: cpIdx,
                              runIndex: rIdx,
                            })
                          }
                          onCellText={(path, cpIdx, rIdx, text) =>
                            onChange(updateCellRunText(doc, path, cpIdx, rIdx, text))
                          }
                        />
                      )
                    }

                    if (run.type === "image") {
                      const image = run as AnyObj
                      return image.src ? (
                        <img
                          key={`p${paragraphIndex}-r${runIndex}`}
                          className="hwpx-image"
                          src={image.src}
                          alt=""
                          style={{
                            width: hwpunitToPx(image.width),
                            height: hwpunitToPx(image.height),
                          }}
                        />
                      ) : (
                        <span
                          key={`p${paragraphIndex}-r${runIndex}`}
                          className="hwpx-image-placeholder"
                        >
                          이미지
                        </span>
                      )
                    }

                    if (run.type === "shape") {
                      return (
                        <span
                          key={`p${paragraphIndex}-r${runIndex}`}
                          className="hwpx-shape-placeholder"
                        >
                          {(run as AnyObj).shape_tag ?? "도형"}
                        </span>
                      )
                    }

                    return null
                  })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EditableTable({
  table,
  paragraphIndex,
  runIndex,
  ctx,
  activePath,
  onCellFocus,
  onCellText,
}: {
  table: HwpxFrontendTable
  paragraphIndex: number
  runIndex: number
  ctx: RenderCtx
  activePath: TableCellPath | null
  onCellFocus: (path: TableCellPath, cellParagraphIndex: number, runIndex: number) => void
  onCellText: (
    path: TableCellPath,
    cellParagraphIndex: number,
    runIndex: number,
    text: string,
  ) => void
}) {
  return (
    <table className="hwpx-table">
      <tbody>
        {table.rows?.map((tableRow, rowIdx) => (
          <tr key={rowIdx}>
            {tableRow.cells?.map((cell, cellIdx) => {
              const path: TableCellPath = {
                paragraphIndex,
                runIndex,
                row: cell.row ?? rowIdx,
                col: cell.col ?? cellIdx,
              }
              const margin = (cell.margin ?? {}) as AnyObj
              const isActive =
                activePath?.row === path.row && activePath?.col === path.col
              return (
                <td
                  key={cellIdx}
                  rowSpan={cell.row_span ?? 1}
                  colSpan={cell.col_span ?? 1}
                  className={cn("hwpx-table-cell", isActive && "hwpx-cell-active")}
                  style={{
                    width: hwpunitToPx(cell.width),
                    paddingTop: hwpunitToPx(margin.top) ?? 1,
                    paddingRight: hwpunitToPx(margin.right) ?? 4,
                    paddingBottom: hwpunitToPx(margin.bottom) ?? 1,
                    paddingLeft: hwpunitToPx(margin.left) ?? 4,
                    verticalAlign: mapVerticalAlign(cell.vertical_align),
                    backgroundColor:
                      cell.backgroundColor && cell.backgroundColor !== "none"
                        ? cell.backgroundColor
                        : undefined,
                    ...resolveCellBorders(
                      (cell as AnyObj).borderFillIDRef as string | undefined,
                      ctx.borderFills,
                    ),
                  }}
                >
                  {(cell.paragraphs ?? []).map((cellParagraph, cpIdx) => (
                    <div
                      key={cpIdx}
                      className="hwpx-paragraph"
                      style={getParagraphStyle(cellParagraph as AnyObj)}
                    >
                      {(cellParagraph.runs ?? []).map((run, rIdx) =>
                        run.type === "text_run" ? (
                          <EditableText
                            key={`c${cpIdx}-r${rIdx}`}
                            value={String((run as HwpxFrontendTextRun).text ?? "")}
                            style={getTextRunStyle(run as AnyObj)}
                            onFocus={() => onCellFocus(path, cpIdx, rIdx)}
                            onInput={(text) => onCellText(path, cpIdx, rIdx, text)}
                          />
                        ) : null,
                      )}
                    </div>
                  ))}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
