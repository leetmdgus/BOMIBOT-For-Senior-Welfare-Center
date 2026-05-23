"use client"

import { LayoutTemplate, Type } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AddDocumentBlocksBarProps = {
  onAddHeading: () => void
  onAddBody: () => void
  readOnly?: boolean
  sectionCount?: number
  bodyCount?: number
  className?: string
}

/** 사업계획·평가 하단 — 대목차 / 본문 블록 추가 */
export function AddDocumentBlocksBar({
  onAddHeading,
  onAddBody,
  readOnly,
  sectionCount = 0,
  bodyCount = 0,
  className,
}: AddDocumentBlocksBarProps) {
  if (readOnly) return null

  return (
    <div
      className={cn(
        "print-hide rounded-lg border border-dashed border-black/35 bg-[#fafafa] px-4 py-4",
        className,
      )}
    >
      <p className="mb-3 text-center text-xs font-medium text-neutral-600">
        블록·양식 추가
      </p>
      <div className="flex flex-col flex-wrap items-center justify-center gap-2 sm:flex-row">
        <Button type="button" variant="outline" size="sm" onClick={onAddHeading}>
          <LayoutTemplate className="mr-2 size-4" />
          대목차
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onAddBody}>
          <Type className="mr-2 size-4" />
          본문 (고급 서식)
        </Button>
      </div>
      {sectionCount > 0 ? (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          블록 {sectionCount}개
          {bodyCount > 0 ? ` · 본문 ${bodyCount}개` : ""}
        </p>
      ) : null}
    </div>
  )
}
