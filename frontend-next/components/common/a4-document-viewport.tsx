"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

/** A4 2장 가로(420mm) — 평가서 등 넓은 양식 */
export const DOCUMENT_VIEWPORT_WIDTH_MM = 420

/** A4 1장(210mm) — 사업계획서 등 */
export const DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM = 210

const MIN_SCALE = 0.52
const BOTTOM_GAP = 40

type A4DocumentViewportProps = {
  children: ReactNode
  className?: string
  /** 세로로 A4 한 페이지 분량이 보이도록 축소 */
  fitToViewport?: boolean
  /** 문서 가로 폭(mm). 기본 420(2×A4) */
  pageWidthMm?: number
}

/**
 * 사업계획·평가 양식 — 가로 2×A4(420mm) 가운데 정렬, 세로는 뷰포트에 맞춤
 */
export function A4DocumentViewport({
  children,
  className,
  fitToViewport = true,
  pageWidthMm = DOCUMENT_VIEWPORT_WIDTH_MM,
}: A4DocumentViewportProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ scale: 1, width: 0, height: 0 })

  const measure = useCallback(() => {
    const page = pageRef.current
    if (!page) return

    const naturalW = page.offsetWidth
    const naturalH = page.scrollHeight
    if (naturalW <= 0 || naturalH <= 0) return

    const top = page.getBoundingClientRect().top
    const availableH = Math.max(320, window.innerHeight - top - BOTTOM_GAP)

    let scale = 1
    if (fitToViewport) {
      scale = Math.min(1, availableH / naturalH)
      scale = Math.max(MIN_SCALE, scale)
    }

    setLayout({
      scale,
      width: naturalW * scale,
      height: naturalH * scale,
    })
  }, [fitToViewport])

  useEffect(() => {
    measure()
    const page = pageRef.current
    if (!page) return

    const ro = new ResizeObserver(() => measure())
    ro.observe(page)
    if (page.parentElement) ro.observe(page.parentElement)

    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure, children])

  const scaled = fitToViewport && layout.scale < 1

  return (
    <div
      className={cn(
        "a4-document-viewport flex w-full min-w-0 justify-center",
        className,
      )}
      style={
        {
          ["--a4-page-width" as string]: `${pageWidthMm}mm`,
          ["--hwpx-doc-max-width" as string]: `${pageWidthMm}mm`,
        } as CSSProperties
      }
    >
      <div
        className="a4-document-viewport__clip"
        style={{
          width: layout.width > 0 ? layout.width : "100%",
          height: layout.height > 0 ? layout.height : undefined,
        }}
      >
        <div
          ref={pageRef}
          className="a4-document-viewport__page"
          style={
            scaled
              ? {
                  transform: `scale(${layout.scale})`,
                  transformOrigin: "top left",
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}
