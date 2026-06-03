"use client"

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DocumentSectionControlsProps = {
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete?: () => void
  className?: string
  /** bar: 블록 상단 툴바 · side: 표 우측 세로 · compact: 가로 미니 */
  layout?: "bar" | "side" | "compact"
}

/** 문서 섹션(대목차·본문) 이동·삭제 */
export function DocumentSectionControls({
  onMoveUp,
  onMoveDown,
  onDelete,
  className,
  layout = "side",
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
          지우기
        </Button>
      </div>
    )
  }

  if (layout === "compact") {
    return (
      <div
        className={cn(
          "print-hide inline-flex items-center gap-0.5",
          className,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-5 p-0"
          title="위로"
          onClick={onMoveUp}
        >
          <ChevronUp className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-5 p-0"
          title="아래로"
          onClick={onMoveDown}
        >
          <ChevronDown className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-[10px] text-destructive hover:text-destructive"
          title="블록 지우기"
          onClick={onDelete}
        >
          지우기
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "print-hide flex flex-col items-center gap-0.5 py-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-5 p-0"
        title="위로"
        onClick={onMoveUp}
      >
        <ChevronUp className="size-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-5 p-0"
        title="아래로"
        onClick={onMoveDown}
      >
        <ChevronDown className="size-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-5 p-0 text-destructive hover:text-destructive"
        title="지우기"
        onClick={onDelete}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  )
}
