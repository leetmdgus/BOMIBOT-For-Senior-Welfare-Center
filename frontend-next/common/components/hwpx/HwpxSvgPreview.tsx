"use client"

// HwpxSvgPreview.tsx — rhwp(Rust 렌더러)가 만든 페이지 SVG를 표시하는 정확 미리보기.
// 편집(doc) 변경 시 디바운스 후 백엔드에 재렌더 요청(편집 반영). rhwp 미가용/오류 시
// 기존 DOM 근사 렌더러(HwpxRenderer)로 폴백해 항상 무언가는 보여 준다.

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { HwpxRenderer } from "@common/components/hwpx/HwpxRenderer"
import { HwpxSvgPages } from "@common/components/hwpx/HwpxSvgPages"
import { ApiError } from "@/lib/api-client"
import type { HwpxFrontendDocument } from "@/lib/hwpx/frontend-render-types"
import { renderHwpxSvg } from "@/services/automation.service"
import "./HwpxSvgPreview.css"

type HwpxSvgPreviewProps = {
  /** 렌더 대상 원본 파일(.hwpx). rhwp가 이 바이트를 렌더한다. */
  file: File
  /** 편집된 frontend JSON. 있으면 원본에 writeback 후 렌더(편집 반영). */
  doc: HwpxFrontendDocument | null
  /** 편집 후 재렌더 디바운스(ms). */
  debounceMs?: number
}

export function HwpxSvgPreview({ file, doc, debounceMs = 500 }: HwpxSvgPreviewProps) {
  const [pages, setPages] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 마지막 요청만 반영(편집 연타 시 경쟁 방지)
  const requestSeq = useRef(0)
  // 최초 렌더는 즉시, 이후 편집은 디바운스
  const hasRendered = useRef(false)

  useEffect(() => {
    const seq = ++requestSeq.current
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        const result = await renderHwpxSvg(file, doc)
        if (requestSeq.current !== seq) return
        if (result.pages.length === 0) {
          setError("rhwp 렌더 결과가 비어 있습니다.")
        } else {
          setPages(result.pages)
          setError(null)
          hasRendered.current = true
        }
      } catch (err) {
        if (requestSeq.current !== seq) return
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "정확 렌더링에 실패했습니다.",
        )
      } finally {
        if (requestSeq.current === seq) setLoading(false)
      }
    }

    const delay = hasRendered.current ? debounceMs : 0
    const timer = window.setTimeout(run, delay)
    return () => window.clearTimeout(timer)
  }, [file, doc, debounceMs])

  // rhwp 미가용/오류 + 아직 정확 렌더 결과 없음 → 근사 렌더러로 폴백
  if (error && !pages) {
    return (
      <div className="hwpx-svg-fallback">
        <p className="hwpx-svg-note">
          정확 렌더(rhwp)를 사용할 수 없어 근사 미리보기로 표시합니다.
          <span className="hwpx-svg-note-detail"> {error}</span>
        </p>
        {doc ? <HwpxRenderer data={doc} /> : null}
      </div>
    )
  }

  if (!pages) {
    return (
      <div className="hwpx-svg-loading">
        <Loader2 className="size-5 animate-spin" />
        정확 렌더링 중…
      </div>
    )
  }

  const overlay = loading ? (
    <div className="hwpx-svg-overlay">
      <Loader2 className="size-4 animate-spin" />
      갱신 중…
    </div>
  ) : error ? (
    // 재렌더 실패(직전 페이지는 유지) — 최신 편집이 반영되지 않았음을 알림
    <div className="hwpx-svg-overlay hwpx-svg-overlay-error">
      최신 편집 반영 실패 · 이전 미리보기 표시 중
    </div>
  ) : null

  return <HwpxSvgPages pages={pages} overlay={overlay} />
}
