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

/**
 * text_run 서식. 백엔드 make_render_json의 char_style_map와 같은 필드를 쓰며,
 * 프론트에서 이 값을 바꾸면(=원본과 달라지면) 백엔드가 charPr를 새로 만들어 반영한다.
 */
export type HwpxTextRunStyle = {
  /** 글꼴 이름(face). 변경 시 header.xml 글꼴 목록에 없으면 백엔드가 추가 */
  font?: string | null
  /** charPr height (pt*100). size_px_guess와 둘 중 하나로 크기 지정 */
  height?: number | null
  /** 화면 px 추정치(= height/100). 프론트 크기 편집은 이 값을 변경 */
  size_px_guess?: number | null
  bold?: boolean
  italic?: boolean
  /** #RRGGBB 또는 "none" */
  textColor?: string | null
  underline?: { type?: string } | Record<string, unknown> | null
  strikeout?: { shape?: string } | Record<string, unknown> | null
  [key: string]: unknown
}

export type HwpxFrontendTextRun = {
  type: "text_run"
  text: string
  style?: HwpxTextRunStyle
  /** 원본 section0 hp:p 내 run 위치(백엔드 writeback 매칭 키). 신규 run은 생략 */
  run_index?: number
}

export type HwpxFrontendTable = {
  type: "table"
  width?: number
  height?: number
  rows: HwpxFrontendTableRow[]
  /** 프론트에서 새로 추가한 표 — 백엔드가 새 tbl을 생성 */
  isNew?: boolean
}

export type HwpxFrontendTableRow = {
  type: "table_row"
  cells: HwpxFrontendTableCell[]
}

export type HwpxFrontendTableCell = {
  type: "table_cell"
  /** 셀 주소(백엔드 writeback 매칭 키) */
  row?: number
  col?: number
  row_span?: number
  col_span?: number
  width?: number
  height?: number
  /** #RRGGBB 또는 "none". 변경 시 백엔드가 borderFill을 새로 만들어 반영 */
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
  /** 프론트에서 새로 삽입한 이미지 — 백엔드가 BinData로 임베드 */
  isNew?: boolean
  /** 신규 이미지 원본 (data:image/...;base64,...) */
  dataUrl?: string
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
      .filter((item): item is HwpxFrontendTextRun => item.type === "text_run")
      .map((item) => String(item.text ?? ""))
      .join("")
  }

  return next
}

// ============================================================
// 편집 JSON 변형(mutator) — 프론트 편집기 ↔ 백엔드 writeback 계약
//   모두 순수 함수: 입력 doc을 복제해 수정본을 반환한다.
//   백엔드 section0_writeback이 동일 의미로 소비한다(원본과 달라진 것만 반영).
// ============================================================

/** 표 셀 위치 — paragraph[runIndex]가 table run, 그 안의 (row,col) 셀 */
export type TableCellPath = {
  paragraphIndex: number
  runIndex: number
  row: number
  col: number
}

function isTextRun(run: HwpxFrontendRun): run is HwpxFrontendTextRun {
  return (run as { type?: string }).type === "text_run"
}

function isTable(run: HwpxFrontendRun): run is HwpxFrontendTable {
  return (run as { type?: string }).type === "table"
}

function recomputeParagraphText(paragraph: HwpxFrontendParagraph): void {
  paragraph.text = (paragraph.runs ?? [])
    .filter(isTextRun)
    .map((run) => String(run.text ?? ""))
    .join("")
}

function findCell(
  doc: HwpxFrontendDocument,
  path: TableCellPath,
): HwpxFrontendTableCell | null {
  const paragraph = doc.document.paragraphs[path.paragraphIndex]
  const run = paragraph?.runs?.[path.runIndex]
  if (!run || !isTable(run)) return null
  for (const tableRow of run.rows ?? []) {
    for (const cell of tableRow.cells ?? []) {
      if (cell.row === path.row && cell.col === path.col) return cell
    }
  }
  return null
}

/** 최상위 문단 text_run 텍스트 변경 */
export function updateRunText(
  doc: HwpxFrontendDocument,
  paragraphIndex: number,
  runIndex: number,
  text: string,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const paragraph = next.document.paragraphs[paragraphIndex]
  const run = paragraph?.runs?.[runIndex]
  if (run && isTextRun(run)) {
    run.text = text
    recomputeParagraphText(paragraph)
  }
  return next
}

/** 최상위 문단 text_run 서식 변경(글꼴·크기·bold·색 등) */
export function updateRunStyle(
  doc: HwpxFrontendDocument,
  paragraphIndex: number,
  runIndex: number,
  patch: Partial<HwpxTextRunStyle>,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const run = next.document.paragraphs[paragraphIndex]?.runs?.[runIndex]
  if (run && isTextRun(run)) {
    run.style = { ...(run.style ?? {}), ...patch }
  }
  return next
}

/** 표 셀 배경색 변경 (#RRGGBB 또는 "none") */
export function updateCellBackground(
  doc: HwpxFrontendDocument,
  path: TableCellPath,
  color: string,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const cell = findCell(next, path)
  if (cell) cell.backgroundColor = color
  return next
}

/** 표 셀 안 문단(cellParagraphIndex)의 text_run 텍스트 변경 */
export function updateCellRunText(
  doc: HwpxFrontendDocument,
  path: TableCellPath,
  cellParagraphIndex: number,
  runIndex: number,
  text: string,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const cell = findCell(next, path)
  const paragraph = cell?.paragraphs?.[cellParagraphIndex]
  const run = paragraph?.runs?.[runIndex]
  if (paragraph && run && isTextRun(run)) {
    run.text = text
    recomputeParagraphText(paragraph)
  }
  return next
}

/** 표 셀 안 text_run 서식 변경 */
export function updateCellRunStyle(
  doc: HwpxFrontendDocument,
  path: TableCellPath,
  cellParagraphIndex: number,
  runIndex: number,
  patch: Partial<HwpxTextRunStyle>,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const cell = findCell(next, path)
  const run = cell?.paragraphs?.[cellParagraphIndex]?.runs?.[runIndex]
  if (run && isTextRun(run)) {
    run.style = { ...(run.style ?? {}), ...patch }
  }
  return next
}

/**
 * AI 자동 채움 적용 — fills의 키는 "{paragraphIndex}.{runIndex}.{row}.{col}" (백엔드 collect_fillable_cells와 동일).
 * 각 빈 셀의 첫 문단 첫 text_run에 값을 넣는다(없으면 생성). 적용된 칸 수를 함께 반환.
 */
export function fillCellsByIds(
  doc: HwpxFrontendDocument,
  fills: Record<string, string>,
): { doc: HwpxFrontendDocument; appliedCount: number } {
  const next = structuredClone(doc)
  let appliedCount = 0

  for (const [id, rawValue] of Object.entries(fills)) {
    const value = String(rawValue ?? "")
    if (!value.trim()) continue

    const parts = id.split(".").map((part) => Number(part))
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) continue
    const [paragraphIndex, runIndex, row, col] = parts

    const run = next.document.paragraphs[paragraphIndex]?.runs?.[runIndex]
    if (!run || !isTable(run)) continue

    let target: HwpxFrontendTableCell | null = null
    for (const tableRow of run.rows ?? []) {
      for (const cell of tableRow.cells ?? []) {
        if ((cell.row ?? -1) === row && (cell.col ?? -1) === col) {
          target = cell
          break
        }
      }
      if (target) break
    }
    if (!target) continue

    if (!target.paragraphs || target.paragraphs.length === 0) {
      target.paragraphs = [{ type: "paragraph", runs: [], text: "" }]
    }
    const paragraph = target.paragraphs[0]
    paragraph.runs = paragraph.runs ?? []
    const textRun = paragraph.runs.find(isTextRun)
    if (textRun) {
      textRun.text = value
    } else {
      paragraph.runs.unshift({ type: "text_run", text: value })
    }
    recomputeParagraphText(paragraph)
    appliedCount += 1
  }

  return { doc: next, appliedCount }
}

/** rows×cols 빈 표 생성 (백엔드가 isNew 표를 새 tbl로 생성) */
export function createEmptyTable(rows: number, cols: number): HwpxFrontendTable {
  const tableRows: HwpxFrontendTableRow[] = []
  for (let r = 0; r < rows; r += 1) {
    const cells: HwpxFrontendTableCell[] = []
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        type: "table_cell",
        row: r,
        col: c,
        row_span: 1,
        col_span: 1,
        paragraphs: [
          { type: "paragraph", runs: [{ type: "text_run", text: "" }], text: "" },
        ],
      })
    }
    tableRows.push({ type: "table_row", cells })
  }
  return { type: "table", rows: tableRows, isNew: true }
}

/** 새 표를 afterParagraphIndex 뒤 새 문단으로 추가 */
export function appendTableAfterParagraph(
  doc: HwpxFrontendDocument,
  afterParagraphIndex: number,
  rows: number,
  cols: number,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const paragraph: HwpxFrontendParagraph = {
    type: "paragraph",
    runs: [createEmptyTable(rows, cols)],
    text: "",
  }
  const insertAt = Math.min(
    Math.max(afterParagraphIndex + 1, 0),
    next.document.paragraphs.length,
  )
  next.document.paragraphs.splice(insertAt, 0, paragraph)
  return next
}

/** 새 이미지를 afterParagraphIndex 뒤 새 문단으로 삽입 (백엔드가 BinData 임베드) */
export function appendImageParagraph(
  doc: HwpxFrontendDocument,
  afterParagraphIndex: number,
  dataUrl: string,
  width?: number,
  height?: number,
): HwpxFrontendDocument {
  const next = structuredClone(doc)
  const image: HwpxFrontendImage = {
    type: "image",
    isNew: true,
    dataUrl,
    src: dataUrl,
    width,
    height,
  }
  const paragraph: HwpxFrontendParagraph = {
    type: "paragraph",
    runs: [image],
    text: "",
  }
  const insertAt = Math.min(
    Math.max(afterParagraphIndex + 1, 0),
    next.document.paragraphs.length,
  )
  next.document.paragraphs.splice(insertAt, 0, paragraph)
  return next
}
