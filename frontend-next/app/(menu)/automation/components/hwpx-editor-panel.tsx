"use client"

import { useRef, useState } from "react"
import {
  Bold,
  ImagePlus,
  Italic,
  Underline as UnderlineIcon,
} from "lucide-react"

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

/** 서식 툴바가 적용할 "활성(포커스된) 텍스트" 위치 */
type ActiveTarget =
  | { scope: "top"; paragraphIndex: number; runIndex: number }
  | {
      scope: "cell"
      path: TableCellPath
      cellParagraphIndex: number
      runIndex: number
    }

type HwpxEditorPanelProps = {
  doc: HwpxFrontendDocument
  onChange: (next: HwpxFrontendDocument) => void
  readOnly?: boolean
  className?: string
}

function readActiveRun(
  doc: HwpxFrontendDocument,
  target: ActiveTarget | null,
): HwpxFrontendTextRun | null {
  if (!target) return null
  if (target.scope === "top") {
    const run = doc.document.paragraphs[target.paragraphIndex]?.runs?.[
      target.runIndex
    ]
    return run && run.type === "text_run" ? (run as HwpxFrontendTextRun) : null
  }
  const tableRun = doc.document.paragraphs[target.path.paragraphIndex]?.runs?.[
    target.path.runIndex
  ]
  if (!tableRun || tableRun.type !== "table") return null
  for (const tableRow of (tableRun as HwpxFrontendTable).rows ?? []) {
    for (const cell of tableRow.cells ?? []) {
      if (cell.row === target.path.row && cell.col === target.path.col) {
        const run = cell.paragraphs?.[target.cellParagraphIndex]?.runs?.[
          target.runIndex
        ]
        return run && run.type === "text_run"
          ? (run as HwpxFrontendTextRun)
          : null
      }
    }
  }
  return null
}

/** 렌더 JSON을 직접 변형하는 구조화 편집기 (서식 툴바 + 표·셀색·이미지). */
export function HwpxEditorPanel({
  doc,
  onChange,
  readOnly = false,
  className,
}: HwpxEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState<ActiveTarget | null>(null)
  const lastParagraphIndex = Math.max(doc.document.paragraphs.length - 1, 0)
  const activeRun = readActiveRun(doc, active)

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

  /** 툴바 → 활성 run에 서식 적용 */
  const applyActiveStyle = (patch: Partial<HwpxTextRunStyle>) => {
    if (!active) return
    if (active.scope === "top") {
      onChange(updateRunStyle(doc, active.paragraphIndex, active.runIndex, patch))
    } else {
      onChange(
        updateCellRunStyle(
          doc,
          active.path,
          active.cellParagraphIndex,
          active.runIndex,
          patch,
        ),
      )
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!readOnly ? (
        <HwpxFormatToolbar
          style={activeRun?.style}
          disabled={!activeRun}
          onStyle={applyActiveStyle}
          onInsertImage={() => fileInputRef.current?.click()}
        />
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

      {doc.document.paragraphs.map((paragraph, paragraphIndex) => (
        <div key={paragraphIndex} className="space-y-2">
          {paragraph.runs?.map((run, runIndex) => {
            if (run.type === "text_run") {
              const textRun = run as HwpxFrontendTextRun
              if (
                !String(textRun.text ?? "").trim() &&
                !textRun.run_index &&
                textRun.run_index !== 0
              ) {
                return null
              }
              return (
                <RunEditor
                  key={`p${paragraphIndex}-r${runIndex}`}
                  label={`문단 ${paragraphIndex + 1}`}
                  run={textRun}
                  readOnly={readOnly}
                  onFocus={() =>
                    setActive({ scope: "top", paragraphIndex, runIndex })
                  }
                  onText={(text) =>
                    onChange(updateRunText(doc, paragraphIndex, runIndex, text))
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
                  onCellBackground={(path, color) =>
                    onChange(updateCellBackground(doc, path, color))
                  }
                  onCellFocus={(path, cpIdx, rIdx) =>
                    setActive({
                      scope: "cell",
                      path,
                      cellParagraphIndex: cpIdx,
                      runIndex: rIdx,
                    })
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

/** hwpx(한컴) 서식 도구 모음 느낌의 상단 툴바 — 활성 텍스트에 적용 */
function HwpxFormatToolbar({
  style,
  disabled,
  onStyle,
  onInsertImage,
}: {
  style?: HwpxTextRunStyle
  disabled: boolean
  onStyle: (patch: Partial<HwpxTextRunStyle>) => void
  onInsertImage: () => void
}) {
  const sizePx = styleSizePx(style)
  const underlineOn = Boolean(
    style?.underline &&
      typeof style.underline === "object" &&
      "type" in style.underline &&
      style.underline.type &&
      style.underline.type !== "NONE",
  )

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-md border bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <select
        aria-label="글꼴"
        disabled={disabled}
        value={typeof style?.font === "string" ? style.font : ""}
        onChange={(event) => onStyle({ font: event.target.value })}
        className="h-8 rounded border bg-background px-1.5 text-xs disabled:opacity-50"
      >
        <option value="">글꼴</option>
        {FONT_OPTIONS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>

      <Input
        type="number"
        min={6}
        max={72}
        aria-label="글자 크기"
        disabled={disabled}
        value={sizePx ?? ""}
        placeholder="pt"
        onChange={(event) => {
          const px = Number(event.target.value)
          if (Number.isFinite(px) && px > 0) {
            onStyle({ size_px_guess: px, height: Math.round(px * 100) })
          }
        }}
        className="h-8 w-16"
      />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <ToolbarToggle
        label="굵게"
        active={Boolean(style?.bold)}
        disabled={disabled}
        onClick={() => onStyle({ bold: !style?.bold })}
      >
        <Bold className="size-4" />
      </ToolbarToggle>
      <ToolbarToggle
        label="기울임"
        active={Boolean(style?.italic)}
        disabled={disabled}
        onClick={() => onStyle({ italic: !style?.italic })}
      >
        <Italic className="size-4" />
      </ToolbarToggle>
      <ToolbarToggle
        label="밑줄"
        active={underlineOn}
        disabled={disabled}
        onClick={() =>
          onStyle({ underline: { type: underlineOn ? "NONE" : "SOLID" } })
        }
      >
        <UnderlineIcon className="size-4" />
      </ToolbarToggle>

      <input
        type="color"
        aria-label="글자색"
        disabled={disabled}
        value={normalizeColor(
          typeof style?.textColor === "string" ? style.textColor : null,
          "#000000",
        )}
        onChange={(event) => onStyle({ textColor: event.target.value })}
        className="h-8 w-8 cursor-pointer rounded border bg-background p-0.5 disabled:opacity-50"
        title="글자색"
      />

      <div className="ml-auto" />
      <Button type="button" variant="outline" size="sm" onClick={onInsertImage}>
        <ImagePlus className="size-4" />
        이미지
      </Button>
    </div>
  )
}

function ToolbarToggle({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded border disabled:opacity-50",
        active ? "bg-foreground text-background" : "bg-background",
      )}
    >
      {children}
    </button>
  )
}

function RunEditor({
  label,
  run,
  readOnly,
  onFocus,
  onText,
}: {
  label: string
  run: HwpxFrontendTextRun
  readOnly?: boolean
  onFocus: () => void
  onText: (text: string) => void
}) {
  return (
    <div className="space-y-1 rounded-md border p-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        value={String(run.text ?? "")}
        readOnly={readOnly}
        onFocus={onFocus}
        onChange={(event) => onText(event.target.value)}
      />
    </div>
  )
}

function TableEditor({
  table,
  readOnly,
  paragraphIndex,
  runIndex,
  onCellText,
  onCellBackground,
  onCellFocus,
}: {
  table: HwpxFrontendTable
  readOnly?: boolean
  paragraphIndex: number
  runIndex: number
  onCellText: (path: TableCellPath, cpIdx: number, rIdx: number, text: string) => void
  onCellBackground: (path: TableCellPath, color: string) => void
  onCellFocus: (path: TableCellPath, cpIdx: number, rIdx: number) => void
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
                  const firstTextRunIndex = (
                    cell.paragraphs?.[0]?.runs ?? []
                  ).findIndex((r) => r.type === "text_run")
                  const firstTextRun =
                    firstTextRunIndex >= 0
                      ? (cell.paragraphs[0].runs[
                          firstTextRunIndex
                        ] as HwpxFrontendTextRun)
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
                        onFocus={() =>
                          firstTextRun
                            ? onCellFocus(path, 0, firstTextRunIndex)
                            : undefined
                        }
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
                            value={normalizeColor(
                              cell.backgroundColor ?? null,
                              "#ffffff",
                            )}
                            onChange={(event) =>
                              onCellBackground(path, event.target.value)
                            }
                            className="h-6 w-6 cursor-pointer rounded border p-0.5"
                            title="셀 배경색"
                          />
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
