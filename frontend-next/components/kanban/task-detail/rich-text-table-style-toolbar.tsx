"use client"

import { useState } from "react"
import { Grid3x3, Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  TABLE_BORDER_STYLE_OPTIONS,
  TABLE_BORDER_WIDTHS_PX,
  TABLE_CELL_FILL_PALETTE,
  type TableBorderLineStyle,
  type TableBorderStyle,
} from "@/lib/rich-text-table-style"

const TABLE_BORDER_COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#FFFFFF",
  "#980000",
  "#FF0000",
  "#FF9900",
  "#FFFF00",
  "#00FF00",
  "#4A86E8",
  "#0000FF",
  "#9900FF",
] as const

type RichTextTableStyleToolbarProps = {
  disabled?: boolean
  onApplyFill: (color: string | null) => void
  onApplyBorder: (border: TableBorderStyle) => void
  onApplyBorderToWholeTable?: (border: TableBorderStyle) => void
}

export function RichTextTableStyleToolbar({
  disabled,
  onApplyFill,
  onApplyBorder,
  onApplyBorderToWholeTable,
}: RichTextTableStyleToolbarProps) {
  const [fillOpen, setFillOpen] = useState(false)
  const [borderOpen, setBorderOpen] = useState(false)
  const [borderStyle, setBorderStyle] = useState<TableBorderLineStyle>("solid")
  const [borderWidth, setBorderWidth] = useState("1")
  const [borderColor, setBorderColor] = useState("#000000")

  const buildBorder = (): TableBorderStyle => ({
    style: borderStyle,
    widthPx: Number(borderWidth) || 1,
    color: borderColor,
  })

  const applyBorder = (scope: "cells" | "table") => {
    const border = buildBorder()
    if (scope === "table" && onApplyBorderToWholeTable) {
      onApplyBorderToWholeTable(border)
    } else {
      onApplyBorder(border)
    }
    setBorderOpen(false)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5"
      data-rte-table-chrome
      onMouseDown={(e) => e.preventDefault()}
    >
      <Popover open={fillOpen} onOpenChange={setFillOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            title="셀 배경색"
            className="h-7 min-w-7 gap-0.5 px-1.5 text-gray-700 hover:bg-gray-200/80"
          >
            <Palette className="size-3.5" />
            <span className="text-[10px]">셀색</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[200px] p-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            셀 배경색
          </p>
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              title="배경 없음"
              className="size-6 rounded-sm border border-gray-300 bg-white text-[9px] text-gray-500 hover:ring-2 hover:ring-primary/40"
              onClick={() => {
                onApplyFill(null)
                setFillOpen(false)
              }}
            >
              없음
            </button>
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
                onClick={() => {
                  onApplyFill(color)
                  setFillOpen(false)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={borderOpen} onOpenChange={setBorderOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            title="표 테두리"
            className="h-7 min-w-7 gap-0.5 px-1.5 text-gray-700 hover:bg-gray-200/80"
          >
            <Grid3x3 className="size-3.5" />
            <span className="text-[10px]">선</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[240px] p-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            표 테두리
          </p>
          <div className="mb-2 flex gap-2">
            <Select
              value={borderStyle}
              onValueChange={(v) =>
                setBorderStyle(v as TableBorderLineStyle)
              }
            >
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue placeholder="선 모양" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_BORDER_STYLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={borderWidth} onValueChange={setBorderWidth}>
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue placeholder="두께" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_BORDER_WIDTHS_PX.map((px) => (
                  <SelectItem key={px} value={String(px)} className="text-xs">
                    {px}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mb-1 text-[10px] text-muted-foreground">선 색</p>
          <div className="mb-3 grid grid-cols-7 gap-1">
            {TABLE_BORDER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                className={cn(
                  "size-5 rounded-sm border border-gray-300/80 hover:ring-2 hover:ring-primary/40",
                  borderColor === color && "ring-2 ring-primary",
                  color === "#FFFFFF" && "bg-white",
                )}
                style={{ backgroundColor: color }}
                onClick={() => setBorderColor(color)}
              />
            ))}
          </div>
          <div
            className="mb-3 h-8 rounded border bg-white"
            style={{
              border:
                borderStyle === "none"
                  ? "1px dashed #ccc"
                  : `${borderWidth}px ${borderStyle} ${borderColor}`,
            }}
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => applyBorder("cells")}
            >
              선택 셀에 적용
            </Button>
            {onApplyBorderToWholeTable ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => applyBorder("table")}
              >
                표 전체에 적용
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
