"use client"

import { useCallback } from "react"

import {
  A4DocumentViewport,
  DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM,
} from "@common/components/a4-document-viewport"
import { HwpxDocument } from "@menu/kanban/components/task-detail/hwpx-document-ui"
import {
  hwpUnitToPx,
  isPlainTextParagraph,
  setCellText,
  setParagraphText,
  type CellPath,
} from "@/lib/kanban/template-frontend-json"
import { cn } from "@/lib/utils"
import type {
  HwpxFrontendJson,
  HwpxParagraph,
  HwpxRunStyle,
  HwpxTableCell,
  HwpxTableRun,
} from "@/services/document-templates.types"

type TemplateDocumentEditorProps = {
  frontendJson: HwpxFrontendJson
  readOnly?: boolean
  onChange: (next: HwpxFrontendJson) => void
  /** 채울 칸(빈 칸)을 옅게 강조 */
  highlightEmpty?: boolean
}

function runStyleToCss(style?: HwpxRunStyle | null): React.CSSProperties {
  if (!style) return {}
  const css: React.CSSProperties = {}
  if (style.bold) css.fontWeight = 600
  if (style.italic) css.fontStyle = "italic"
  if (style.textColor && style.textColor !== "none") css.color = style.textColor
  if (typeof style.size_px_guess === "number" && style.size_px_guess > 0) {
    css.fontSize = `${style.size_px_guess}px`
  }
  return css
}

function firstRunStyle(cell: HwpxTableCell): HwpxRunStyle | null {
  for (const p of cell.paragraphs) {
    for (const r of p.runs) {
      if (r.type === "text_run") return r.style ?? null
    }
  }
  return null
}

/** 셀/문단 내 편집용 자동 높이 textarea (테두리 없음, 칸을 채움). */
function CellTextInput({
  value,
  readOnly,
  style,
  onChange,
  emphasize,
}: {
  value: string
  readOnly?: boolean
  style?: React.CSSProperties
  onChange: (next: string) => void
  emphasize?: boolean
}) {
  const rows = Math.max(1, value.split("\n").length)
  if (readOnly) {
    return (
      <span className="block min-w-0 whitespace-pre-wrap break-words" style={style}>
        {value || " "}
      </span>
    )
  }
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "block w-full min-w-0 resize-none border-0 bg-transparent p-0",
        "text-inherit leading-snug outline-none focus:bg-sky-50",
        emphasize && "bg-amber-50/60",
      )}
      style={style}
    />
  )
}

export function TemplateDocumentEditor({
  frontendJson,
  readOnly = false,
  onChange,
  highlightEmpty = true,
}: TemplateDocumentEditorProps) {
  const paragraphs = frontendJson.document?.paragraphs ?? []

  const updateCell = useCallback(
    (path: CellPath, text: string) => {
      onChange(setCellText(frontendJson, path, text))
    },
    [frontendJson, onChange],
  )

  const updateParagraph = useCallback(
    (paragraphIndex: number, text: string) => {
      onChange(setParagraphText(frontendJson, paragraphIndex, text))
    },
    [frontendJson, onChange],
  )

  return (
    <A4DocumentViewport fitToViewport={false} pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}>
      <HwpxDocument>
        <div className="template-doc space-y-2 p-4 text-[13px] leading-relaxed">
          {paragraphs.map((para, pIndex) => (
            <ParagraphView
              key={pIndex}
              para={para}
              paragraphIndex={pIndex}
              readOnly={readOnly}
              highlightEmpty={highlightEmpty}
              onCellChange={updateCell}
              onParagraphChange={updateParagraph}
            />
          ))}
        </div>
      </HwpxDocument>
    </A4DocumentViewport>
  )
}

function ParagraphView({
  para,
  paragraphIndex,
  readOnly,
  highlightEmpty,
  onCellChange,
  onParagraphChange,
}: {
  para: HwpxParagraph
  paragraphIndex: number
  readOnly: boolean
  highlightEmpty: boolean
  onCellChange: (path: CellPath, text: string) => void
  onParagraphChange: (paragraphIndex: number, text: string) => void
}) {
  // 표를 포함한 문단 — 각 표를 렌더
  const tableRuns = para.runs
    .map((run, runIndex) => ({ run, runIndex }))
    .filter((x) => x.run.type === "table")

  if (tableRuns.length > 0) {
    return (
      <>
        {tableRuns.map(({ run, runIndex }) => (
          <TableView
            key={runIndex}
            table={run as HwpxTableRun}
            paragraphIndex={paragraphIndex}
            runIndex={runIndex}
            readOnly={readOnly}
            highlightEmpty={highlightEmpty}
            onCellChange={onCellChange}
          />
        ))}
      </>
    )
  }

  // 텍스트 전용 문단
  if (isPlainTextParagraph(para)) {
    const text = para.text ?? ""
    if (!text.trim() && readOnly) {
      return <div className="h-3" aria-hidden /> // 빈 줄 간격
    }
    return (
      <div className="px-1">
        <CellTextInput
          value={text}
          readOnly={readOnly}
          onChange={(next) => onParagraphChange(paragraphIndex, next)}
        />
      </div>
    )
  }

  // 이미지/도형 등 — Phase 1 미편집(자리 표시)
  return (
    <div className="rounded border border-dashed border-neutral-300 px-2 py-1 text-[11px] text-neutral-400">
      [이미지/도형 — 편집 미지원]
    </div>
  )
}

function TableView({
  table,
  paragraphIndex,
  runIndex,
  readOnly,
  highlightEmpty,
  onCellChange,
}: {
  table: HwpxTableRun
  paragraphIndex: number
  runIndex: number
  readOnly: boolean
  highlightEmpty: boolean
  onCellChange: (path: CellPath, text: string) => void
}) {
  const tableWidthPx = hwpUnitToPx(table.width)
  return (
    <table
      className="border-collapse"
      style={{ width: tableWidthPx ? `${tableWidthPx}px` : "100%", tableLayout: "fixed" }}
    >
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.cells.map((cell, cellIndex) => {
              const widthPx = hwpUnitToPx(cell.width)
              const isEmpty = !(cell.text || "").trim()
              const style = firstRunStyle(cell)
              return (
                <td
                  key={cellIndex}
                  rowSpan={cell.row_span > 1 ? cell.row_span : undefined}
                  colSpan={cell.col_span > 1 ? cell.col_span : undefined}
                  className="border border-neutral-400 px-1.5 py-1 align-top"
                  style={{
                    width: widthPx ? `${widthPx}px` : undefined,
                    backgroundColor:
                      cell.backgroundColor && cell.backgroundColor !== "none"
                        ? cell.backgroundColor
                        : undefined,
                    verticalAlign:
                      cell.vertical_align === "CENTER"
                        ? "middle"
                        : cell.vertical_align === "BOTTOM"
                          ? "bottom"
                          : "top",
                  }}
                >
                  <CellTextInput
                    value={cell.text ?? ""}
                    readOnly={readOnly}
                    style={runStyleToCss(style)}
                    emphasize={highlightEmpty && isEmpty}
                    onChange={(next) =>
                      onCellChange(
                        { paragraphIndex, runIndex, rowIndex, cellIndex },
                        next,
                      )
                    }
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
