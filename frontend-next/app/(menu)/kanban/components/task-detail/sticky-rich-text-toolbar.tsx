"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { RichTextToolbarPanel } from "@menu/kanban/components/task-detail/rich-text-toolbar-panel"
import { useRichTextToolbarOptional } from "@menu/kanban/components/task-detail/rich-text-toolbar-context"
import {
  RICH_TEXT_TOOLBAR_RAIL_WIDTH_PX,
  useSidebarAdjacentToolbar,
} from "@menu/kanban/components/task-detail/use-sidebar-adjacent-toolbar"
import { cn } from "@/lib/utils"

/** 좌측 사이드바 옆 세로 고정 서식 툴바 */
export function StickyRichTextToolbar({ className }: { className?: string }) {
  const ctx = useRichTextToolbarOptional()
  const layout = useSidebarAdjacentToolbar()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const scroll = document.getElementById("task-detail-scroll")
    if (!scroll) return

    if (ctx?.enabled) {
      scroll.classList.add("has-rich-text-toolbar-rail")
      scroll.style.setProperty(
        "--rich-text-toolbar-rail-width",
        `${RICH_TEXT_TOOLBAR_RAIL_WIDTH_PX}px`,
      )
    } else {
      scroll.classList.remove("has-rich-text-toolbar-rail")
      scroll.style.removeProperty("--rich-text-toolbar-rail-width")
    }

    return () => {
      scroll.classList.remove("has-rich-text-toolbar-rail")
      scroll.style.removeProperty("--rich-text-toolbar-rail-width")
    }
  }, [ctx?.enabled])

  if (!ctx?.enabled) return null

  const title = ctx.activeLabel
    ? `${ctx.activeLabel} · 서식`
    : "문서 서식"

  const rail = (
    <div
      data-print-chrome
      role="toolbar"
      aria-label="본문 서식 도구"
      className={cn(
        "document-format-toolbar-rail print-hide flex flex-col overflow-hidden border-r border-slate-200/90 bg-slate-50/95 shadow-[2px_0_14px_rgba(15,23,42,0.08)] backdrop-blur-sm",
        className,
      )}
      style={
        layout.ready
          ? {
              position: "fixed",
              left: layout.left,
              top: layout.top,
              bottom: 0,
              width: layout.width,
              zIndex: 44,
            }
          : { display: "none" }
      }
    >
      <RichTextToolbarPanel
        variant={ctx.variant}
        onVariantChange={ctx.setVariant}
        editor={ctx.activeEditor}
        title={title}
        orientation="vertical"
        className="h-full min-h-0 border-0 bg-transparent"
      />
    </div>
  )

  return mounted && layout.ready && typeof document !== "undefined"
    ? createPortal(rail, document.body)
    : null
}
