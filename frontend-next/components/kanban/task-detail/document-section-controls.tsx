"use client"

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DocumentSectionControlsProps = {
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  className?: string
  /** bar: 블록 상단 툴바(대목차) · corner: 우측 아이콘(본문) */
  layout?: "bar" | "corner"
}

/** 문서 섹션(대목차·본문) 이동·삭제 */
export function DocumentSectionControls({
  onMoveUp,
  onMoveDown,
  onDelete,
  className,
  layout = "corner",
}: DocumentSectionControlsProps) {
  if (layout === "bar") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-end gap-2 px-3 py-2",
          className,
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 bg-white"
          onClick={onMoveUp}
        >
          <ChevronUp className="mr-1 size-3.5" />
          위로
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 bg-white"
          onClick={onMoveDown}
        >
          <ChevronDown className="mr-1 size-3.5" />
          아래로
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-destructive/40 bg-white text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-1 size-3.5" />
          대목차 삭제
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "print-hide flex flex-col items-center gap-1",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0"
        title="위로 이동"
        onClick={onMoveUp}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0"
        title="아래로 이동"
        onClick={onMoveDown}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0 text-destructive hover:text-destructive"
        title="이 블록 삭제"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
