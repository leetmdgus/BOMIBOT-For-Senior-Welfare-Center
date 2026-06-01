/** HWPX 표·문서 AST — 편집 HTML ↔ 다운로드/렌더 공통 모델 */

export type HwpBlock =
  | HwpParagraphBlock
  | HwpTable

export type HwpParagraphBlock = {
  type: "paragraph"
  content: HwpTextRun[]
}

export type HwpTextRun = {
  type: "text"
  text: string
}

export type HwpTable = {
  type: "table"
  id: string
  columns: HwpColumn[]
  rows: HwpTableRow[]
  hwp?: Record<string, unknown>
}

export type HwpColumn = {
  width: number
}

export type HwpTableRow = {
  type: "tableRow"
  id: string
  cells: HwpTableCell[]
}

export type HwpTableCell = {
  type: "tableCell"
  id: string
  rowSpan: number
  colSpan: number
  grid: { row: number; col: number }
  style: {
    backgroundColor?: string | null
    verticalAlign?: "top" | "middle" | "bottom"
    header?: boolean
  }
  content: HwpBlock[]
  hwp?: Record<string, unknown>
}

export type HwpHeaderFooter = {
  id: string
  type: "header" | "footer"
  blocks: HwpBlock[]
  hwp?: Record<string, unknown>
}

export type HwpPageLayout = {
  width: number
  height: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
}

export type HwpDocumentMeta = {
  page: HwpPageLayout
  headers: HwpHeaderFooter[]
  footers: HwpHeaderFooter[]
}

/** HWPX 표 가로 합계 (HWPUNIT) */
export const HWP_TABLE_WIDTH_HWPUNIT = 42520

export const DEFAULT_HWP_PAGE: HwpPageLayout = {
  width: 794,
  height: 1123,
  marginTop: 72,
  marginRight: 64,
  marginBottom: 72,
  marginLeft: 64,
}
