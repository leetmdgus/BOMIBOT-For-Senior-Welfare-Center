import {
  isKanbanDocumentsPrintArea,
  KANBAN_DOCUMENTS_PRINT_CSS,
} from "@/lib/kanban-documents-print-css"
import { preparePrintAreaHtml } from "@/lib/prepare-print-area-html"

/** 브라우저 인쇄 머리글(날짜·URL·페이지)에 쓰이지 않도록 빈 제목 */
const PRINT_FRAME_TITLE = "\u00A0"

function buildIframePrintStyles(documentsLandscape: boolean): string {
  if (documentsLandscape) {
    return `
  html, body { margin: 0; padding: 0; background: #fff !important; }
  body.is-printing, body.is-printing * { visibility: visible !important; }
  .print-hide, [data-print-chrome], [aria-label="첨부 자료"], .document-media-sections, .document-media-block { display: none !important; }
  @media print {
    ${KANBAN_DOCUMENTS_PRINT_CSS}
    .print-area, .print-area .print-document-root {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box;
    }
  }
`
  }

  return `
  html, body { margin: 0; padding: 0; background: #fff !important; }
  body.is-printing, body.is-printing * { visibility: visible !important; }
  .print-hide, [data-print-chrome], [aria-label="첨부 자료"], .document-media-sections, .document-media-block { display: none !important; }
  @media print {
    @page {
      size: A4 portrait;
      /* 위·아래 여백은 페이지마다 필수 적용 (longhand 로 명시 — 일부 브라우저의 shorthand 무시 회피).
         좌·우는 .print-area 패딩에서 처리. 패딩은 첫 페이지 위·마지막 페이지 아래에만 적용되므로
         페이지마다 보장되는 상하 여백은 반드시 @page margin 으로 줘야 함 */
      margin-top: 17mm;
      margin-bottom: 17mm;
      margin-left: 0;
      margin-right: 0;
    }
    body.is-printing .print-area {
      /* 좌·우 여백만 — 위·아래는 @page margin이 페이지마다 적용 */
      padding: 0 14mm !important;
      box-sizing: border-box;
    }
    .print-area, .print-area .hwpx-doc, .print-area .a4-document-viewport__page,
    .print-document-root {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box;
    }
    .print-area .a4-document-viewport__clip {
      width: 100% !important;
      transform: none !important;
    }
  }
`
}
/** 인쇄 전용 iframe — about:blank + 빈 제목으로 머리글 최소화 */
export function printPrintArea(): void {
  const printArea = document.querySelector<HTMLElement>(".print-area")
  if (!printArea) {
    printWithBlankChrome(() => window.print())
    return
  }

  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "인쇄")
  iframe.setAttribute("src", "about:blank")
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  })
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (!win || !doc) {
    iframe.remove()
    printWithBlankChrome(() => window.print())
    return
  }

  const stylesheetLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  )
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join("\n")

  const inlineStyles = Array.from(document.querySelectorAll("style"))
    .map((el) => el.outerHTML)
    .join("\n")

  const documentsLandscape = isKanbanDocumentsPrintArea(printArea)
  const iframePrintStyles = buildIframePrintStyles(documentsLandscape)
  const printBodyHtml = preparePrintAreaHtml(printArea)

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${PRINT_FRAME_TITLE}</title>
${stylesheetLinks}
${inlineStyles}
<style>${iframePrintStyles}</style>
</head>
<body class="is-printing">
<div class="print-area print-document${documentsLandscape ? " kanban-documents-print" : ""}">${printBodyHtml}</div>
</body>
</html>`

  const cleanup = () => {
    iframe.remove()
  }

  const doPrint = () => {
    const frameDoc = iframe.contentDocument
    const frameWin = iframe.contentWindow
    if (!frameDoc || !frameWin) {
      cleanup()
      return
    }
    try {
      frameDoc.title = PRINT_FRAME_TITLE
      frameWin.document.title = PRINT_FRAME_TITLE
    } catch {
      /* ignore */
    }
    frameWin.focus()
    frameWin.print()
    frameWin.addEventListener("afterprint", cleanup, { once: true })
    window.setTimeout(cleanup, 120_000)
  }

  const writeAndPrint = () => {
    const frameDoc = iframe.contentDocument
    if (!frameDoc) {
      cleanup()
      return
    }
    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()
    window.setTimeout(doPrint, 400)
  }

  if (iframe.contentDocument?.readyState === "complete") {
    writeAndPrint()
  } else {
    iframe.addEventListener("load", writeAndPrint, { once: true })
  }
}

/** Ctrl+P 등 직접 인쇄 시에도 탭 제목이 머리글에 안 나가도록 */
function printWithBlankChrome(printFn: () => void): void {
  const prevTitle = document.title
  document.title = PRINT_FRAME_TITLE
  try {
    printFn()
  } finally {
    window.setTimeout(() => {
      document.title = prevTitle
    }, 500)
  }
}
