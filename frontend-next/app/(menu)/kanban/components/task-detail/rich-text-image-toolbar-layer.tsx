"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlignCenter, AlignLeft, AlignRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ImageAlign = "left" | "center" | "right"
type ToolbarPos = { top: number; left: number }

type RichTextImageToolbarLayerProps = {
  editorRoot: HTMLElement | null
  /** 정렬 적용 후 본문 영속화 (emitChange) */
  onChange: () => void
  /** 변경 직전 — 실행취소 스냅샷 적재 */
  onBeforeMutation?: () => void
}

function imageWrapOf(img: HTMLImageElement): HTMLElement | null {
  const wrap = img.closest(".bp-rt-image-wrap")
  return wrap instanceof HTMLElement ? wrap : null
}

function currentAlign(img: HTMLImageElement): ImageAlign {
  const ta = imageWrapOf(img)?.style.textAlign
  if (ta === "left" || ta === "right") return ta
  return "center"
}

/**
 * 본문 이미지 위에 좌/가운데/우 정렬 툴바를 띄우는 오버레이.
 * contentEditable 바깥(portal)에 렌더해 저장/내보내기 HTML 을 오염시키지 않는다.
 * 정렬은 `.bp-rt-image-wrap` 문단의 text-align 으로 적용된다.
 */
export function RichTextImageToolbarLayer({
  editorRoot,
  onChange,
  onBeforeMutation,
}: RichTextImageToolbarLayerProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [pos, setPos] = useState<ToolbarPos | null>(null)

  const reposition = useCallback((target: HTMLImageElement | null) => {
    if (!target || !target.isConnected) {
      setPos(null)
      return
    }
    const rect = target.getBoundingClientRect()
    setPos({ top: rect.top, left: rect.left + rect.width / 2 })
  }, [])

  const close = useCallback(() => {
    setImg(null)
    setPos(null)
  }, [])

  // 이미지 클릭 → 활성화, 그 외 클릭 → 닫기
  useEffect(() => {
    const root = editorRoot
    if (!root) return

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest(".bp-rt-image-resize")) return // 리사이즈 핸들은 무시
      const hit = target.closest("img.bp-rt-image")
      if (hit instanceof HTMLImageElement) {
        setImg(hit)
        reposition(hit)
      } else {
        close()
      }
    }

    root.addEventListener("click", onClick)
    return () => root.removeEventListener("click", onClick)
  }, [editorRoot, reposition, close])

  // 바깥 클릭/ESC 로 닫기, 스크롤·리사이즈 시 위치 갱신
  useEffect(() => {
    if (!img) return

    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("[data-rt-image-toolbar]")) return
      if (!t.closest("img.bp-rt-image")) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    const onScrollResize = () => reposition(img)

    window.addEventListener("mousedown", onDown, true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("scroll", onScrollResize, true)
    window.addEventListener("resize", onScrollResize)
    return () => {
      window.removeEventListener("mousedown", onDown, true)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", onScrollResize, true)
      window.removeEventListener("resize", onScrollResize)
    }
  }, [img, reposition, close])

  if (!img || !pos || typeof document === "undefined") return null

  const active = currentAlign(img)

  const apply = (dir: ImageAlign) => {
    const wrap = imageWrapOf(img)
    if (!wrap) return
    onBeforeMutation?.()
    wrap.style.textAlign = dir
    onChange()
    reposition(img)
  }

  return createPortal(
    <div
      data-rt-image-toolbar
      className="fixed z-[200] flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-md border border-gray-300 bg-white p-0.5 shadow-lg"
      style={{ left: pos.left, top: pos.top - 6 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <AlignButton
        icon={AlignLeft}
        title="왼쪽 정렬"
        active={active === "left"}
        onClick={() => apply("left")}
      />
      <AlignButton
        icon={AlignCenter}
        title="가운데 정렬"
        active={active === "center"}
        onClick={() => apply("center")}
      />
      <AlignButton
        icon={AlignRight}
        title="오른쪽 정렬"
        active={active === "right"}
        onClick={() => apply("right")}
      />
    </div>,
    document.body,
  )
}

function AlignButton({
  icon: Icon,
  title,
  active,
  onClick,
}: {
  icon: LucideIcon
  title: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded text-slate-700 hover:bg-slate-100",
        active && "bg-primary/10 text-primary ring-1 ring-primary/30",
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
