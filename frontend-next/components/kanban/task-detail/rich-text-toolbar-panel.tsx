"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { RichTextEditorHandle } from "./business-plan-rich-text"
import {
  CompactToolbar,
  FullToolbar,
  type RichTextToolbarVariant,
} from "./business-plan-rich-text"

export type { RichTextToolbarVariant }

type RichTextToolbarPanelProps = {
  variant: RichTextToolbarVariant
  onVariantChange: (variant: RichTextToolbarVariant) => void
  editor: RichTextEditorHandle | null
  title?: string
  className?: string
  orientation?: "horizontal" | "vertical"
}

/** 블록 서식 툴바 — 가로(기본) 또는 좌측 세로 레일 */
export function RichTextToolbarPanel({
  variant,
  onVariantChange,
  editor,
  title = "문서 서식",
  className,
  orientation = "horizontal",
}: RichTextToolbarPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [, selectionTick] = useState(0)
  const sourceMode = editor?.isSourceMode ?? false
  const vertical = orientation === "vertical"

  useEffect(() => {
    if (!editor) return
    let frame = 0
    const refresh = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => selectionTick((n) => n + 1))
    }
    document.addEventListener("selectionchange", refresh)
    document.addEventListener("bp-rt-table-selection-change", refresh)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("selectionchange", refresh)
      document.removeEventListener("bp-rt-table-selection-change", refresh)
    }
  }, [editor])

  const exec = (command: string, valueArg?: string) => {
    editor?.exec(command, valueArg)
  }

  const insertHtml = (html: string) => {
    editor?.insertHtml(html)
  }

  return (
    <div
      data-print-chrome
      className={cn(
        "bp-rich-editor-toolbar print-hide bg-slate-50/80",
        vertical
          ? "bp-rich-editor-toolbar--vertical"
          : "border-b border-gray-200",
        className,
      )}
    >
      <div
        className={cn(
          "bp-rich-editor-toolbar__header",
          vertical
            ? "flex flex-col gap-2 px-3 py-2.5"
            : "flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5",
        )}
      >
        <span
          className={cn(
            "font-medium text-muted-foreground",
            vertical ? "text-[11px] leading-snug" : "text-xs",
          )}
        >
          {title}
        </span>
        <div
          className={cn(
            vertical ? "flex flex-col gap-1.5" : "flex flex-wrap items-center gap-2",
          )}
        >
          <div
            className={cn(
              "flex rounded-md border border-gray-200 bg-white p-0.5",
              vertical && "flex-col",
            )}
          >
            <Button
              type="button"
              variant={variant === "compact" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 text-xs", vertical && "w-full justify-start")}
              onClick={() => onVariantChange("compact")}
            >
              간단
            </Button>
            <Button
              type="button"
              variant={variant === "full" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 text-xs", vertical && "w-full justify-start")}
              onClick={() => onVariantChange("full")}
            >
              한글형
            </Button>
          </div>
          {variant === "full" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1 text-xs text-muted-foreground",
                vertical && "w-full justify-start",
              )}
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
              {collapsed ? "펼치기" : "접기"}
            </Button>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <div
          className={cn(
            "bp-rich-editor-toolbar__body",
            !vertical && "border-t border-gray-200/80",
            !editor && "pointer-events-none opacity-50",
          )}
        >
          {variant === "compact" ? (
            <CompactToolbar
              orientation={orientation}
              onExec={exec}
              onInsertHtml={insertHtml}
            />
          ) : (
            <FullToolbar
              orientation={orientation}
              onExec={exec}
              onInsertHtml={insertHtml}
              onSourceToggle={() => editor?.toggleSource()}
              sourceMode={sourceMode}
              editor={editor}
            />
          )}
        </div>
      ) : null}

      {!collapsed && !editor ? (
        <p
          className={cn(
            "text-[11px] text-muted-foreground",
            vertical ? "px-3 pb-3" : "px-4 pb-2",
          )}
        >
          편집할 블록(요약 표·본문)을 클릭하세요. 고급 서식(표·병합 등)은 「본문」 리치
          편집기에서 사용할 수 있습니다.
        </p>
      ) : null}
    </div>
  )
}
