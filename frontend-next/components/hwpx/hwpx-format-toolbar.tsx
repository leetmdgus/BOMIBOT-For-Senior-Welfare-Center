"use client"

// hwpx-format-toolbar.tsx — 포커스된 텍스트(run)에 글꼴/크기/굵게/기울임/밑줄/색을 적용하는
// 공용 서식 툴바. 측면 패널 편집기와 문서 위 직접수정(WYSIWYG) 편집기가 함께 쓴다.

import { Bold, ImagePlus, Italic, Underline as UnderlineIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { HwpxTextRunStyle } from "@/lib/hwpx/frontend-render-types"
import { cn } from "@/lib/utils"

export const FONT_OPTIONS = [
  "맑은 고딕",
  "함초롬바탕",
  "함초롬돋움",
  "바탕",
  "굴림",
  "돋움",
  "궁서",
]

export function styleSizePx(style?: HwpxTextRunStyle): number | undefined {
  if (!style) return undefined
  if (typeof style.size_px_guess === "number") return style.size_px_guess
  if (typeof style.height === "number") return style.height / 100
  return undefined
}

export function normalizeColor(value: string | null, fallback: string): string {
  if (!value || value === "none") return fallback
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1)
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return fallback
}

/** hwpx(한컴) 서식 도구 모음 — 활성 텍스트에 적용 */
export function HwpxFormatToolbar({
  style,
  disabled,
  onStyle,
  onInsertImage,
  className,
}: {
  style?: HwpxTextRunStyle
  disabled: boolean
  onStyle: (patch: Partial<HwpxTextRunStyle>) => void
  onInsertImage: () => void
  className?: string
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
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-md border bg-card/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/80",
        className,
      )}
    >
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
        onClick={() => onStyle({ underline: { type: underlineOn ? "NONE" : "SOLID" } })}
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
