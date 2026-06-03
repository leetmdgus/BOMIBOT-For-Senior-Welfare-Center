"use client"

import { useRef } from "react"
import { ImagePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  appendImageParagraph,
  updateCellBackground,
  updateCellRunStyle,
  updateCellRunText,
  updateRunStyle,
  updateRunText,
  type HwpxFrontendDocument,
  type HwpxFrontendTable,
  type HwpxFrontendTextRun,
  type HwpxTextRunStyle,
  type TableCellPath,
} from "@/lib/hwpx/frontend-render-types"
import { cn } from "@/lib/utils"

const FONT_OPTIONS = [
  "맑은 고딕",
  "함초롬바탕",
  "함초롬돋움",
  "바탕",
  "굴림",
  "돋움",
  "궁서",
]

type HwpxEditorPanelProps = {
  doc: HwpxFrontendDocument
  onChange: (next: HwpxFrontendDocument) => void
  readOnly?: boolean
  className?: string
}

/** 렌더 JSON을 직접 변형하는 구조화 편집기 (표·셀색·글꼴·크기·이미지). */
export function HwpxEditorPanel({
  doc,
  onChange,
  readOnly = false,
  className,
}: HwpxEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastParagraphIndex = Math.max(doc.document.paragraphs.length - 1, 0)

  const handleInsertImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (dataUrl) {
        onChange(appendImageParagraph(doc, lastParagraphIndex, dataUrl))
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          {/* 신규 표 생성은 백엔드 미지원(다운로드 시 무시)이라 비노출 — 한글 깨짐/데이터 손실 방지 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            이미지 삽입
          </Button>
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
        </div>
      ) : null}

      {doc.document.paragraphs.map((paragraph, paragraphIndex) => (
        <div key={paragraphIndex} className="space-y-2">
          {paragraph.runs?.map((run, runIndex) => {
            if (run.type === "text_run") {
              const textRun = run as HwpxFrontendTextRun
              if (!String(textRun.text ?? "").trim() && !textRun.run_index && textRun.run_index !== 0) {
                return null
              }
              return (
                <RunEditor
                  key={`p${paragraphIndex}-r${runIndex}`}
                  label={`문단 ${paragraphIndex + 1}`}
                  run={textRun}
                  readOnly={readOnly}
                  onText={(text) =>
                    onChange(updateRunText(doc, paragraphIndex, runIndex, text))
                  }
                  onStyle={(patch) =>
                    onChange(updateRunStyle(doc, paragraphIndex, runIndex, patch))
                  }
                />
              )
            }

            if (run.type === "table") {
              return (
                <TableEditor
                  key={`p${paragraphIndex}-r${runIndex}`}
                  table={run as HwpxFrontendTable}
                  readOnly={readOnly}
                  onCellText={(path, cpIdx, rIdx, text) =>
                    onChange(updateCellRunText(doc, path, cpIdx, rIdx, text))
                  }
                  onCellStyle={(path, cpIdx, rIdx, patch) =>
                    onChange(updateCellRunStyle(doc, path, cpIdx, rIdx, patch))
                  }
                  onCellBackground={(path, color) =>
                    onChange(updateCellBackground(doc, path, color))
                  }
                  paragraphIndex={paragraphIndex}
                  runIndex={runIndex}
                />
              )
            }

            if (run.type === "image") {
              return (
                <p
                  key={`p${paragraphIndex}-r${runIndex}`}
                  className="text-xs text-muted-foreground"
                >
                  🖼️ 이미지 {(run as { isNew?: boolean }).isNew ? "(추가됨)" : ""}
                </p>
              )
            }

            return null
          })}
        </div>
      ))}
    </div>
  )
}

function styleSizePx(style?: HwpxTextRunStyle): number | undefined {
  if (!style) return undefined
  if (typeof style.size_px_guess === "number") return style.size_px_guess
  if (typeof style.height === "number") return style.height / 100
  return undefined
}

function StyleControls({
  style,
  readOnly,
  onStyle,
}: {
  style?: HwpxTextRunStyle
  readOnly?: boolean
  onStyle: (patch: Partial<HwpxTextRunStyle>) => void
}) {
  if (readOnly) return null
  const sizePx = styleSizePx(style)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={Boolean(style?.bold)}
        onClick={() => onStyle({ bold: !style?.bold })}
        className={cn(
          "h-7 w-7 rounded border text-sm font-bold",
          style?.bold ? "bg-foreground text-background" : "bg-background",
        )}
      >
        B
      </button>
      <Input
        type="number"
        min={6}
        max={72}
        value={sizePx ?? ""}
        placeholder="pt"
        onChange={(event) => {
          const px = Number(event.target.value)
          if (Number.isFinite(px) && px > 0) {
            onStyle({ size_px_guess: px, height: Math.round(px * 100) })
          }
        }}
        className="h-7 w-16"
      />
      <select
        value={typeof style?.font === "string" ? style.font : ""}
        onChange={(event) => onStyle({ font: event.target.value })}
        className="h-7 rounded border bg-background px-1 text-xs"
      >
        <option value="">글꼴</option>
        {FONT_OPTIONS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
      <input
        type="color"
        aria-label="글자색"
        value={normalizeColor(typeof style?.textColor === "string" ? style.textColor : null, "#000000")}
        onChange={(event) => onStyle({ textColor: event.target.value })}
        className="h-7 w-7 cursor-pointer rounded border bg-background p-0.5"
      />
    </div>
  )
}

function RunEditor({
  label,
  run,
  readOnly,
  onText,
  onStyle,
}: {
  label: string
  run: HwpxFrontendTextRun
  readOnly?: boolean
  onText: (text: string) => void
  onStyle: (patch: Partial<HwpxTextRunStyle>) => void
}) {
  return (
    <div className="space-y-1 rounded-md border p-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        value={String(run.text ?? "")}
        readOnly={readOnly}
        onChange={(event) => onText(event.target.value)}
      />
      <StyleControls style={run.style} readOnly={readOnly} onStyle={onStyle} />
    </div>
  )
}

function TableEditor({
  table,
  readOnly,
  paragraphIndex,
  runIndex,
  onCellText,
  onCellStyle,
  onCellBackground,
}: {
  table: HwpxFrontendTable
  readOnly?: boolean
  paragraphIndex: number
  runIndex: number
  onCellText: (path: TableCellPath, cpIdx: number, rIdx: number, text: string) => void
  onCellStyle: (
    path: TableCellPath,
    cpIdx: number,
    rIdx: number,
    patch: Partial<HwpxTextRunStyle>,
  ) => void
  onCellBackground: (path: TableCellPath, color: string) => void
}) {
  return (
    <div className="space-y-1 rounded-md border p-2">
      <Label className="text-[11px] text-muted-foreground">
        표 {table.isNew ? "(추가됨)" : ""}
      </Label>
      <div className="overflow-x-auto">
        <table className="border-collapse">
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
                  const firstTextRunIndex = (cell.paragraphs?.[0]?.runs ?? []).findIndex(
                    (r) => r.type === "text_run",
                  )
                  const firstTextRun =
                    firstTextRunIndex >= 0
                      ? (cell.paragraphs[0].runs[firstTextRunIndex] as HwpxFrontendTextRun)
                      : null
                  return (
                    <td
                      key={cellIdx}
                      className="border p-1 align-top"
                      style={{
                        backgroundColor:
                          cell.backgroundColor && cell.backgroundColor !== "none"
                            ? cell.backgroundColor
                            : undefined,
                      }}
                    >
                      <Input
                        value={String(firstTextRun?.text ?? "")}
                        readOnly={readOnly || !firstTextRun}
                        onChange={(event) =>
                          onCellText(path, 0, firstTextRunIndex, event.target.value)
                        }
                        className="h-7 min-w-[8rem] text-xs"
                      />
                      {!readOnly ? (
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type="color"
                            aria-label="셀 배경색"
                            value={normalizeColor(cell.backgroundColor ?? null, "#ffffff")}
                            onChange={(event) => onCellBackground(path, event.target.value)}
                            className="h-6 w-6 cursor-pointer rounded border p-0.5"
                            title="셀 배경색"
                          />
                          {firstTextRun ? (
                            <button
                              type="button"
                              aria-pressed={Boolean(firstTextRun.style?.bold)}
                              onClick={() =>
                                onCellStyle(path, 0, firstTextRunIndex, {
                                  bold: !firstTextRun.style?.bold,
                                })
                              }
                              className={cn(
                                "h-6 w-6 rounded border text-xs font-bold",
                                firstTextRun.style?.bold
                                  ? "bg-foreground text-background"
                                  : "bg-background",
                              )}
                            >
                              B
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function normalizeColor(value: string | null, fallback: string): string {
  if (!value || value === "none") return fallback
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1)
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return fallback
}
