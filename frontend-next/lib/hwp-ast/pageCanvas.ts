import type { HwpDocumentMeta, HwpPageLayout } from "@/lib/hwp-ast/types"
import { DEFAULT_HWP_PAGE } from "@/lib/hwp-ast/types"
import { HWPX_PREVIEW_THEME_CSS } from "@/lib/hwp-ast/preview-theme"

/** A4 근사 페이지 HTML 래퍼 (한글 양식 CSS 근사) */
export function wrapHwpxPageHtml(
  bodyHtml: string,
  options?: {
    title?: string
    documentTitle?: string
    meta?: Partial<HwpDocumentMeta>
    headerLabel?: string
    footerLabel?: string
  },
): string {
  const page: HwpPageLayout = options?.meta?.page ?? DEFAULT_HWP_PAGE
  const wrappedBody = bodyHtml.includes("hwpx-doc")
    ? bodyHtml
    : `<div class="hwpx-doc hwpx-doc--preview">${bodyHtml}</div>`
  const docTitle = options?.documentTitle ?? options?.title
  const titleBlock = docTitle
    ? `<h2 class="hwpx-doc__title">${docTitle
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</h2>`
    : ""

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${options?.title ?? "HWPX Preview"}</title>
  <style>${HWPX_PREVIEW_THEME_CSS}
  .hwpx-page { width:${page.width}px; min-height:${page.height}px;
    padding:${page.marginTop}px ${page.marginRight}px ${page.marginBottom}px ${page.marginLeft}px; }
  </style>
</head>
<body>
  <div class="hwpx-page-root">
    <div class="hwpx-page">
      <div class="hwpx-page-header"></div>
      <div class="hwpx-page-body">${titleBlock}${wrappedBody}</div>
      <div class="hwpx-page-footer"></div>
    </div>
  </div>
</body>
</html>`
}
