"use client"

// HwpxRenderer.tsx — HWPX render-JSON을 실제 한글에 가깝게 A4 페이지로 분할 렌더링

import React, { useLayoutEffect, useRef, useState } from "react"
import "./HwpxRenderer.css"

type AnyObj = Record<string, any>

type HwpxDocument = {
  type: string
  maps?: AnyObj
  document: {
    paragraphs: HwpxParagraph[]
  }
}

type HwpxParagraph = {
  type: "paragraph"
  index?: number
  text?: string
  paragraph_style?: AnyObj
  runs: HwpxRun[]
}

type HwpxRun = HwpxTextRun | HwpxTable | HwpxImage | HwpxShape | AnyObj

type HwpxTextRun = { type: "text_run"; text: string; style?: AnyObj }
type HwpxTable = { type: "table"; width?: number; height?: number; col_count?: number; rows: HwpxTableRow[] }
type HwpxTableRow = { type: "table_row"; cells: HwpxTableCell[] }
type HwpxTableCell = {
  type: "table_cell"
  row_span?: number
  col_span?: number
  width?: number
  height?: number
  backgroundColor?: string
  borderFillIDRef?: string
  margin?: { left?: number; right?: number; top?: number; bottom?: number }
  vertical_align?: string
  paragraphs: HwpxParagraph[]
}

type RenderCtx = { borderFills: AnyObj }
type HwpxImage = { type: "image"; src?: string | null; bindata_ref?: string | null; width?: number; height?: number }
type HwpxShape = { type: "shape"; shape_tag?: string; width?: number; height?: number }

// ── 단위 ────────────────────────────────────────────────
// HWPUNIT = 1/7200 inch. 96dpi → px = hwpunit / 75, mm = hwpunit / 7200 * 25.4
const MM_TO_PX = 96 / 25.4
const PAGE_W_MM = 210
const PAGE_H_MM = 297
const DEFAULT_MARGIN_MM = 20
const HANGUL_FALLBACK = '"함초롬바탕", "Batang", "Malgun Gothic", "맑은 고딕", serif'

function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

function hwpunitToPx(v?: number | null): number | undefined {
  if (v == null) return undefined
  return v / 75
}

function hwpunitToMm(v?: number | null): number {
  if (v == null) return DEFAULT_MARGIN_MM
  return (v / 7200) * 25.4
}

type Margins = { top: number; right: number; bottom: number; left: number }

function getMargins(data: HwpxDocument): Margins {
  const pageDef = (data.maps?.page_defs ?? [])[0] as AnyObj | undefined
  const m = pageDef?.margin as AnyObj | undefined
  if (!m) {
    return { top: DEFAULT_MARGIN_MM, right: DEFAULT_MARGIN_MM, bottom: DEFAULT_MARGIN_MM, left: DEFAULT_MARGIN_MM }
  }
  // 본문 영역 = 페이지 여백 + 머리말/꼬리말 높이
  const top = hwpunitToMm(toNum(m.top)) + hwpunitToMm(toNum(m.header))
  const bottom = hwpunitToMm(toNum(m.bottom)) + hwpunitToMm(toNum(m.footer))
  return {
    top: top || DEFAULT_MARGIN_MM,
    right: hwpunitToMm(toNum(m.right)) || DEFAULT_MARGIN_MM,
    bottom: bottom || DEFAULT_MARGIN_MM,
    left: hwpunitToMm(toNum(m.left)) || DEFAULT_MARGIN_MM,
  }
}

function localTag(tag: unknown): string {
  if (typeof tag !== "string") return ""
  return tag.split("}").pop()!.split(":").pop() ?? ""
}

const BORDER_STYLE_MAP: Record<string, string> = {
  SOLID: "solid",
  THICK: "solid",
  DASH: "dashed",
  DOT: "dotted",
  DASH_DOT: "dashed",
  DASH_DOT_DOT: "dashed",
  LONG_DASH: "dashed",
  CIRCLE: "dotted",
  DOUBLE_SLIM: "double",
  SLIM_THICK: "double",
  THICK_SLIM: "double",
}

/** borderFill의 한 변(leftBorder 등) attrs → CSS border 문자열. NONE이면 none. */
function borderSideCss(side: AnyObj | undefined): string {
  const a = (side?.attrs ?? {}) as AnyObj
  const type = String(a.type ?? "NONE").toUpperCase()
  if (type === "NONE" || type === "") return "none"
  const css = BORDER_STYLE_MAP[type] ?? "solid"
  const width = String(a.width ?? "0.12 mm").replace(/\s+/g, "") || "0.12mm"
  const color = a.color && String(a.color).toLowerCase() !== "none" ? a.color : "#000000"
  return `${width} ${css} ${color}`
}

/** 셀 borderFillIDRef → 4변 CSS border. borderFill이 없으면 가는 실선 폴백. */
function resolveCellBorders(
  borderFillId: string | undefined,
  borderFills: AnyObj,
): React.CSSProperties {
  const bf = borderFillId != null ? (borderFills?.[String(borderFillId)] as AnyObj) : undefined
  const raw = bf?.raw_node as AnyObj | undefined
  const children = (raw?.children as AnyObj[] | undefined) ?? null
  if (!children) {
    return { border: "1px solid #000" } // 정보 없음 → 표처럼 보이도록 폴백
  }
  const sides: Record<string, AnyObj> = {}
  for (const child of children) {
    const t = localTag(child?.tag)
    if (t === "leftBorder" || t === "rightBorder" || t === "topBorder" || t === "bottomBorder") {
      sides[t] = child
    }
  }
  return {
    borderTop: borderSideCss(sides.topBorder),
    borderRight: borderSideCss(sides.rightBorder),
    borderBottom: borderSideCss(sides.bottomBorder),
    borderLeft: borderSideCss(sides.leftBorder),
  }
}

function mapTextAlign(value?: string): React.CSSProperties["textAlign"] {
  switch (value) {
    case "CENTER": return "center"
    case "RIGHT": return "right"
    case "JUSTIFY": case "DISTRIBUTE": return "justify"
    default: return "left"
  }
}

function mapVerticalAlign(value?: string): React.CSSProperties["verticalAlign"] {
  switch (value) {
    case "TOP": return "top"
    case "BOTTOM": return "bottom"
    case "CENTER": return "middle"
    default: return "middle"
  }
}

function getParagraphStyle(p: HwpxParagraph): React.CSSProperties {
  const ps = p.paragraph_style ?? {}
  const align = ps.align?.horizontal
  const ls = ps.lineSpacing as AnyObj | undefined
  let lineHeight: number | undefined
  if (ls) {
    const type = String(ls.type ?? "").toUpperCase()
    const val = toNum(ls.value)
    // PERCENT(예: 160) → 1.6. FIXED/AT_LEAST(HWPUNIT)는 글꼴 의존이라 기본값 사용.
    if ((type === "PERCENT" || type === "" ) && val && val > 0) {
      lineHeight = val / 100
    }
  }
  return { textAlign: mapTextAlign(align), lineHeight }
}

function getTextRunStyle(run: HwpxTextRun): React.CSSProperties {
  const s = run.style ?? {}
  const heightPt =
    typeof s.height === "number"
      ? s.height / 100
      : typeof s.size_px_guess === "number"
        ? s.size_px_guess
        : undefined
  return {
    fontFamily: s.font ? `"${s.font}", ${HANGUL_FALLBACK}` : HANGUL_FALLBACK,
    fontSize: heightPt ? `${heightPt}pt` : undefined,
    color: s.textColor && s.textColor !== "none" ? s.textColor : undefined,
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration:
      s.underline?.type && s.underline.type !== "NONE"
        ? "underline"
        : s.strikeout?.shape && s.strikeout.shape !== "NONE"
          ? "line-through"
          : "none",
    whiteSpace: "pre-wrap",
  }
}

function renderTextRun(run: HwpxTextRun, key: React.Key) {
  return (
    <span key={key} className="hwpx-text-run" style={getTextRunStyle(run)}>
      {run.text}
    </span>
  )
}

function renderTable(table: HwpxTable, key: React.Key, ctx: RenderCtx) {
  return (
    <table key={key} className="hwpx-table">
      <tbody>
        {table.rows?.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.cells?.map((cell, cellIndex) => renderTableCell(cell, cellIndex, ctx))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function renderTableCell(cell: HwpxTableCell, key: React.Key, ctx: RenderCtx) {
  const margin = cell.margin ?? {}
  return (
    <td
      key={key}
      rowSpan={cell.row_span ?? 1}
      colSpan={cell.col_span ?? 1}
      className="hwpx-table-cell"
      style={{
        width: hwpunitToPx(cell.width),
        paddingTop: hwpunitToPx(margin.top) ?? 1,
        paddingRight: hwpunitToPx(margin.right) ?? 4,
        paddingBottom: hwpunitToPx(margin.bottom) ?? 1,
        paddingLeft: hwpunitToPx(margin.left) ?? 4,
        verticalAlign: mapVerticalAlign(cell.vertical_align),
        backgroundColor:
          cell.backgroundColor && cell.backgroundColor !== "none"
            ? cell.backgroundColor
            : undefined,
        ...resolveCellBorders(cell.borderFillIDRef, ctx.borderFills),
      }}
    >
      {cell.paragraphs?.map((p, i) => renderParagraph(p, i, ctx))}
    </td>
  )
}

function renderImage(image: HwpxImage, key: React.Key) {
  if (!image.src) {
    return (
      <span
        key={key}
        className="hwpx-image-placeholder"
        style={{ width: hwpunitToPx(image.width) ?? 160, height: hwpunitToPx(image.height) ?? 80 }}
      >
        이미지
      </span>
    )
  }
  return (
    <img
      key={key}
      className="hwpx-image"
      src={image.src}
      alt=""
      style={{ width: hwpunitToPx(image.width), height: hwpunitToPx(image.height) }}
    />
  )
}

function renderShape(shape: HwpxShape, key: React.Key) {
  return (
    <span
      key={key}
      className="hwpx-shape-placeholder"
      style={{ width: hwpunitToPx(shape.width) ?? 100, height: hwpunitToPx(shape.height) ?? 40 }}
    >
      {shape.shape_tag ?? "도형"}
    </span>
  )
}

function renderRun(run: HwpxRun, key: React.Key, ctx: RenderCtx) {
  switch (run.type) {
    case "text_run": return renderTextRun(run as HwpxTextRun, key)
    case "table": return renderTable(run as HwpxTable, key, ctx)
    case "image": return renderImage(run as HwpxImage, key)
    case "shape": return renderShape(run as HwpxShape, key)
    default: return null
  }
}

function renderParagraph(p: HwpxParagraph, key: React.Key, ctx: RenderCtx) {
  const runs = p.runs ?? []
  // 표/이미지 run이 포함될 수 있어 <p> 대신 <div> (브라우저가 <p> 안의 <table>을 강제 종료)
  return (
    <div key={key} className="hwpx-paragraph" style={getParagraphStyle(p)}>
      {runs.length > 0 ? runs.map((run, i) => renderRun(run, i, ctx)) : "​"}
    </div>
  )
}

/**
 * 본문 블록(최상위 문단)을 측정해 A4 본문 높이 단위로 분할.
 * 한 블록이 페이지보다 크면 그 블록만 단독 페이지에 둔다(넘침 허용).
 */
function paginate(heights: number[], contentHeightPx: number): number[][] {
  const pages: number[][] = []
  let current: number[] = []
  let used = 0
  heights.forEach((h, i) => {
    if (current.length > 0 && used + h > contentHeightPx) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(i)
    used += h
  })
  if (current.length > 0) pages.push(current)
  return pages.length > 0 ? pages : [[]]
}

export function HwpxRenderer({ data }: { data: HwpxDocument }) {
  const paragraphs = data.document?.paragraphs ?? []
  const ctx: RenderCtx = { borderFills: data.maps?.border_fills ?? {} }
  const margins = getMargins(data)
  const contentWidthPx = (PAGE_W_MM - margins.left - margins.right) * MM_TO_PX
  const contentHeightPx = (PAGE_H_MM - margins.top - margins.bottom) * MM_TO_PX

  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][]>([
    paragraphs.map((_, i) => i),
  ])

  useLayoutEffect(() => {
    const container = measureRef.current
    if (!container) return
    const heights = Array.from(container.children).map(
      (el) => (el as HTMLElement).offsetHeight,
    )
    setPages(paginate(heights, contentHeightPx))
  }, [data, contentHeightPx, contentWidthPx])

  const pageStyle: React.CSSProperties = {
    width: `${PAGE_W_MM}mm`,
    minHeight: `${PAGE_H_MM}mm`,
    paddingTop: `${margins.top}mm`,
    paddingRight: `${margins.right}mm`,
    paddingBottom: `${margins.bottom}mm`,
    paddingLeft: `${margins.left}mm`,
  }

  return (
    <div className="hwpx-root">
      {/* 측정 전용(비표시) — 본문 폭 동일하게 두고 블록 높이 측정 */}
      <div
        ref={measureRef}
        className="hwpx-measure"
        style={{ width: contentWidthPx }}
        aria-hidden
      >
        {paragraphs.map((p, i) => renderParagraph(p, i, ctx))}
      </div>

      {pages.map((blockIndexes, pageIndex) => (
        <div key={pageIndex} className="hwpx-page" style={pageStyle}>
          {blockIndexes.map((i) =>
            paragraphs[i] ? renderParagraph(paragraphs[i], i, ctx) : null,
          )}
        </div>
      ))}
    </div>
  )
}
