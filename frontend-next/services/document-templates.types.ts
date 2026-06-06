/**
 * 사용자 업로드 문서 양식(템플릿) 타입.
 *
 * frontendJson 은 백엔드 HWPX 파이프라인(normalize_render_json_for_frontend)의 출력 구조를
 * 미러링한다. 파서가 더 많은 필드를 담지만, 에디터/내보내기에 필요한 것만 명시한다.
 */

// --- frontendJson (편집 구조) ---

export interface HwpxTextRun {
  type: "text_run"
  run_index?: number
  text: string
  charPrIDRef?: string
  style?: HwpxRunStyle | null
}

export interface HwpxRunStyle {
  bold?: boolean
  italic?: boolean
  textColor?: string | null
  size_px_guess?: number | null
  height?: number | null
  font?: string | null
}

export interface HwpxTableCell {
  type: "table_cell"
  row: number
  col: number
  row_span: number
  col_span: number
  width?: number | null
  height?: number | null
  vertical_align?: string | null
  borderFillIDRef?: string | null
  backgroundColor?: string | null
  paragraphs: HwpxParagraph[]
  text: string
}

export interface HwpxTableRow {
  type: "table_row"
  row_index: number
  cells: HwpxTableCell[]
}

export interface HwpxTableRun {
  type: "table"
  id?: string | null
  row_count?: number | null
  col_count?: number | null
  width?: number | null
  height?: number | null
  borderFillIDRef?: string | null
  rows: HwpxTableRow[]
}

export interface HwpxImageRun {
  type: "image"
  width?: number | null
  height?: number | null
  src?: string | null
  bindata_ref?: string | null
}

export interface HwpxShapeRun {
  type: "shape"
  width?: number | null
  height?: number | null
}

export type HwpxRun =
  | HwpxTextRun
  | HwpxTableRun
  | HwpxImageRun
  | HwpxShapeRun

export interface HwpxParagraph {
  type: "paragraph"
  index?: number | null
  paraPrIDRef?: string | null
  styleIDRef?: string | null
  runs: HwpxRun[]
  text: string
}

export interface HwpxFrontendJson {
  type?: string
  document: {
    paragraphs: HwpxParagraph[]
    [key: string]: unknown
  }
  maps?: Record<string, unknown>
  [key: string]: unknown
}

// --- 템플릿 메타/상세 ---

export interface DocumentTemplateStats {
  tableCount: number
  cellCount: number
  emptyCellCount: number
}

export type DocumentTemplateKind = "plan" | "evaluation"

export interface DocumentTemplateMeta {
  id: string
  name: string
  sourceFilename: string
  format: "hwpx" | "hwp"
  /** 양식 종류 — 계획/평가. 미지정(null)이면 범용(모든 곳에 노출) */
  kind?: DocumentTemplateKind | null
  storageKey?: string
  stats: DocumentTemplateStats
  createdAt: string
  createdBy: string
}

export interface DocumentTemplateDetail extends DocumentTemplateMeta {
  frontendJson: HwpxFrontendJson
}
