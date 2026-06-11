"use client"

/**
 * 플로팅 툴바 너비·위치 기준 (사업계획서와 동일한 print-document-root / max-w-5xl)
 * 문서 하단에 두고 layout 훅에서 .print-document-root 를 찾습니다.
 */
export function RichTextToolbarWidthAnchor() {
  return (
    <div
      data-rich-toolbar-anchor
      className="print-hide pointer-events-none h-0 w-full shrink-0 overflow-hidden"
      aria-hidden
    />
  )
}
