export type HwpxFrontendDocument = {
  type: string
  maps?: Record<string, unknown>
  document: {
    paragraphs: HwpxFrontendParagraph[]
  }
}

export type HwpxFrontendParagraph = {
  type: "paragraph"
  index?: number
  text?: string
  paragraph_style?: Record<string, unknown>
  runs: HwpxFrontendRun[]
}

export type HwpxFrontendRun =
  | HwpxFrontendTextRun
  | HwpxFrontendTable
  | HwpxFrontendImage
  | HwpxFrontendShape
  | Record<string, unknown>

export type HwpxFrontendTextRun = {
  type: "text_run"
  text: string
  style?: Record<string, unknown>
}

export type HwpxFrontendTable = {
  type: "table"
  width?: number
  height?: number
  rows: HwpxFrontendTableRow[]
}

export type HwpxFrontendTableRow = {
  type: "table_row"
  cells: HwpxFrontendTableCell[]
}

export type HwpxFrontendTableCell = {
  type: "table_cell"
  row_span?: number
  col_span?: number
  width?: number
  height?: number
  backgroundColor?: string
  margin?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  vertical_align?: string
  paragraphs: HwpxFrontendParagraph[]
}

export type HwpxFrontendImage = {
  type: "image"
  src?: string | null
  bindata_ref?: string | null
  width?: number
  height?: number
}

export type HwpxFrontendShape = {
  type: "shape"
  shape_tag?: string
  width?: number
  height?: number
}

export type HwpxParseResponse = {
  frontendJson: HwpxFrontendDocument
  sourceFilename: string
  documentTitle: string
}

export type EditableTextField = {
  id: string
  paragraphIndex: number
  runIndex: number
  label: string
  value: string
}

/** frontend JSON에서 편집 가능한 text_run 목록 추출 */
export function collectEditableTextFields(
  doc: HwpxFrontendDocument,
): EditableTextField[] {
  const fields: EditableTextField[] = []

  doc.document.paragraphs.forEach((paragraph, paragraphIndex) => {
    paragraph.runs?.forEach((run, runIndex) => {
      if (run.type !== "text_run") return
      const text = String(run.text ?? "")
      if (!text.trim()) return

      fields.push({
        id: `p${paragraphIndex}-r${runIndex}`,
        paragraphIndex,
        runIndex,
        label: `문단 ${paragraphIndex + 1} · ${text.slice(0, 24)}${text.length > 24 ? "…" : ""}`,
        value: text,
      })
    })
  })

  return fields
}

/** 편집 필드 값을 frontend JSON에 반영 */
export function applyTextFieldEdits(
  doc: HwpxFrontendDocument,
  fields: EditableTextField[],
): HwpxFrontendDocument {
  const next = structuredClone(doc)

  for (const field of fields) {
    const paragraph = next.document.paragraphs[field.paragraphIndex]
    if (!paragraph) continue

    const run = paragraph.runs[field.runIndex]
    if (!run || run.type !== "text_run") continue

    run.text = field.value
    paragraph.text = paragraph.runs
      .filter((item) => item.type === "text_run")
      .map((item) => String(item.text ?? ""))
      .join("")
  }

  return next
}
