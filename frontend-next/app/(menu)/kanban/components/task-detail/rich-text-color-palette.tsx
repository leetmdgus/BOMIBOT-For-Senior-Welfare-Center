"use client"

import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** CKEditor형 글자색 팔레트 (8열) */
const FOREGROUND_PALETTE = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#B7B7B7",
  "#CCCCCC",
  "#D9D9D9",
  "#FFFFFF",
  "#980000",
  "#FF0000",
  "#FF9900",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#4A86E8",
  "#0000FF",
  "#9900FF",
  "#FF00FF",
  "#E6B8AF",
  "#F4CCCC",
  "#FCE5CD",
  "#FFF2CC",
  "#D9EAD3",
  "#D0E0E3",
  "#C9DAF8",
  "#CFE2F3",
  "#D9D2E9",
  "#EAD1DC",
  "#DD7E6B",
  "#EA9999",
  "#F9CB9C",
  "#FFE599",
  "#B6D7A8",
  "#A2C4C9",
  "#A4C2F4",
  "#9FC5E8",
  "#B4A7D6",
  "#D5A6BD",
  "#CC4125",
  "#E06666",
  "#F6B26B",
  "#FFD966",
  "#93C47D",
  "#76A5AF",
  "#6D9EEB",
  "#6FA8DC",
  "#8E7CC3",
  "#C27BA0",
]

/** CKEditor형 배경(형광)색 팔레트 */
const HIGHLIGHT_PALETTE = [
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#FF00FF",
  "#FF0000",
  "#0000FF",
  "#FFFFFF",
  "#FFFF99",
  "#CCFFCC",
  "#CCFFFF",
  "#FFCCCC",
  "#FFCC99",
  "#FFE599",
  "#D9EAD3",
  "#D0E0E3",
  "#CFE2F3",
  "#D9D2E9",
  "#EAD1DC",
  "#F4CCCC",
  "#FCE5CD",
  "#FFF2CC",
  "#D9D9D9",
  "#EFEFEF",
  "#CCCCCC",
]

type ColorPaletteButtonProps = {
  label: string
  command: "foreColor" | "hiliteColor"
  onExec: (command: string, value?: string) => void
  trigger: ReactNode
  palette?: readonly string[]
}

export function ColorPaletteButton({
  label,
  command,
  onExec,
  trigger,
  palette,
}: ColorPaletteButtonProps) {
  const [open, setOpen] = useState(false)
  const colors =
    palette ??
    (command === "foreColor" ? FOREGROUND_PALETTE : HIGHLIGHT_PALETTE)

  const apply = (color: string) => {
    onExec(command, color)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={label}
          className="h-7 min-w-7 px-1.5 text-gray-700 hover:bg-gray-200/80"
        >
          {trigger}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[220px] p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
        <div className="grid grid-cols-8 gap-1">
          {command === "hiliteColor" ? (
            <button
              type="button"
              title="배경 없음"
              className={cn(
                "size-5 rounded-sm border border-gray-300 bg-white",
                "ring-offset-1 hover:ring-2 hover:ring-primary/40",
              )}
              onClick={() => apply("#FFFFFF")}
            >
              <span className="sr-only">배경 없음</span>
            </button>
          ) : null}
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className={cn(
                "size-5 rounded-sm border border-gray-300/80",
                "ring-offset-1 hover:ring-2 hover:ring-primary/40",
                color === "#FFFFFF" && "bg-white",
              )}
              style={{ backgroundColor: color }}
              onClick={() => apply(color)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
