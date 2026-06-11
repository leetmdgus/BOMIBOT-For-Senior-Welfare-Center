"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const MAX = 8

export function TableInsertGrid({
  onInsert,
  disabled,
}: {
  onInsert: (rows: number, cols: number) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState({ rows: 3, cols: 3 })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          title="표 삽입"
          className="h-7 min-w-7 px-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200/80"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="grid grid-cols-3 gap-px">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="size-1 rounded-[1px] border border-gray-500 bg-white"
              />
            ))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="mb-2 text-center text-xs text-muted-foreground">
          {hover.rows} × {hover.cols} 표
        </p>
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${MAX}, 1fr)` }}
        >
          {Array.from({ length: MAX * MAX }).map((_, index) => {
            const r = Math.floor(index / MAX) + 1
            const c = (index % MAX) + 1
            const active = r <= hover.rows && c <= hover.cols
            return (
              <button
                key={index}
                type="button"
                className={cn(
                  "size-5 rounded-sm border border-gray-300 transition-colors",
                  active ? "bg-primary/70 border-primary" : "bg-white hover:bg-gray-100",
                )}
                onMouseEnter={() => setHover({ rows: r, cols: c })}
                onClick={() => {
                  onInsert(hover.rows, hover.cols)
                  setOpen(false)
                }}
              />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
