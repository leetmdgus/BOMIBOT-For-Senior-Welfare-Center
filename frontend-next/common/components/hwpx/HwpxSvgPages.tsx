"use client"

// HwpxSvgPages — rhwp가 만든 페이지 SVG 문자열 목록을 A4 카드로 표시하는 순수 표현 컴포넌트.
// 데이터 출처(자동화 탭의 File+편집, /files 탭의 fileId)와 무관하게 렌더만 담당.

import type { ReactNode } from "react"

import "./HwpxSvgPreview.css"

type HwpxSvgPagesProps = {
  /** 페이지 순서대로 정렬된 SVG 문자열 */
  pages: string[]
  /** 상단 우측 sticky 오버레이(갱신 중/오류 알림 등) */
  overlay?: ReactNode
}

export function HwpxSvgPages({ pages, overlay }: HwpxSvgPagesProps) {
  return (
    <div className="hwpx-svg-root">
      {overlay}
      {pages.map((svg, index) => (
        <div
          key={index}
          className="hwpx-svg-page"
          // rhwp가 생성한 신뢰된 SVG(<text>/<rect>/<path>만, <script> 없음)
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
    </div>
  )
}
