import JSZip from "jszip"

import {
  decodeHtmlEntities,
  encodeHwpxUtf8,
  escapeXml,
  hpTextRun,
  hpTextRuns,
  sanitizeHwpxText,
} from "@/lib/hwpx/hwpx-encoding"
import {
  buildCellBorderFillXml,
  buildCharPrXml,
  buildContainerXml,
  buildHeaderXml,
  buildManifestXml,
  buildMetaXml,
  buildSectionOpenParagraph,
  buildSettingsXml,
  buildVersionXml,
  HWPX_BORDER,
  HWPX_CHAR,
  HWPX_PARA,
  HWPX_STYLE,
} from "@/lib/hwpx/hwpx-skeleton"

export {
  decodeHtmlEntities,
  escapeXml,
  sanitizeHwpxText,
} from "@/lib/hwpx/hwpx-encoding"

export type HwpxParagraph = {
  text: string
  /** title | heading | body */
  variant?: "title" | "heading" | "body"
}

export type HwpxTableCell = {
  text: string
  colSpan?: number
  rowSpan?: number
  /** 표 헤더(라벨) 셀 — 배경·굵게 */
  header?: boolean
  /** 셀 배경색 (#RRGGBB) — 지정 시 전용 borderFill 생성 */
  backgroundColor?: string
  /** 셀 글자 크기 (px) — 지정 시 전용 charPr 생성 */
  fontSizePx?: number
}

export type HwpxTable = {
  rows: HwpxTableCell[][]
  /** 열 너비 (HWPUNIT). 미지정 시 균등 분할 */
  colWidths?: number[]
}

export type HwpxSection = {
  title?: string
  paragraphs?: HwpxParagraph[]
  tables?: HwpxTable[]
}

export type HwpxDocument = {
  title: string
  sections: HwpxSection[]
}

let paraIdSeq = 1
let tblIdSeq = 1

function nextParaId(): string {
  return String(paraIdSeq++)
}

function nextTblId(): string {
  return String(tblIdSeq++)
}

/** 동적 charPr(글자 크기)·borderFill(셀 배경색) 레지스트리 — 빌드 1회당 초기화 */
type ResourceRegistry = {
  charProps: Map<string, { id: number; xml: string }>
  borderFills: Map<string, { id: number; xml: string }>
  nextCharId: number
  nextBorderId: number
}

let resources: ResourceRegistry = createResourceRegistry()

function createResourceRegistry(): ResourceRegistry {
  return {
    charProps: new Map(),
    borderFills: new Map(),
    // 기본 charPr 0~3, borderFill 0~2 다음부터 할당
    nextCharId: 4,
    nextBorderId: 3,
  }
}

function resetIds(): void {
  paraIdSeq = 1
  tblIdSeq = 1
  resources = createResourceRegistry()
}

/** px 글자 크기 → HWPX charPr 높이(HWPUNIT, 1pt=100). 안전 범위로 clamp */
function fontSizePxToHeight(px: number): number {
  const pt = Math.round(px)
  return Math.min(Math.max(pt * 100, 400), 5000)
}

function normalizeHexColor(color: string): string | null {
  const value = color.trim()
  if (!value || value.toLowerCase() === "transparent") return null
  const hex = /^#([0-9a-fA-F]{6})$/.exec(value)
  if (hex) return `#${hex[1].toUpperCase()}`
  const short = /^#([0-9a-fA-F]{3})$/.exec(value)
  if (short) {
    const [r, g, b] = short[1].split("")
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value)
  if (rgb) {
    const toHex = (n: string) => Number(n).toString(16).padStart(2, "0")
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`.toUpperCase()
  }
  return null
}

/** 셀의 charPrIDRef — 글자 크기 지정 시 전용 charPr 생성/재사용 */
function resolveCellCharId(cell: HwpxTableCell): number {
  const baseId = cell.header ? HWPX_CHAR.label : HWPX_CHAR.body
  if (!cell.fontSizePx) return baseId

  const height = fontSizePxToHeight(cell.fontSizePx)
  const baseHeight = cell.header ? 900 : 1000
  if (height === baseHeight) return baseId

  const key = `${baseId}:${height}`
  const existing = resources.charProps.get(key)
  if (existing) return existing.id

  const id = resources.nextCharId++
  resources.charProps.set(key, {
    id,
    xml: buildCharPrXml(id, height, {
      bold: cell.header,
      textColor: cell.header ? "#1E293B" : "#111827",
    }),
  })
  return id
}

/** 셀의 borderFillIDRef — 배경색 지정 시 전용 borderFill 생성/재사용 */
function resolveCellBorderId(cell: HwpxTableCell): number {
  const baseId = cell.header ? HWPX_BORDER.headerCell : HWPX_BORDER.table
  if (!cell.backgroundColor) return baseId

  const color = normalizeHexColor(cell.backgroundColor)
  if (!color) return baseId

  const key = color
  const existing = resources.borderFills.get(key)
  if (existing) return existing.id

  const id = resources.nextBorderId++
  resources.borderFills.set(key, {
    id,
    xml: buildCellBorderFillXml(id, color),
  })
  return id
}

const HWPX_LINE_AREA = 42520

function addUtf8File(
  zip: JSZip,
  path: string,
  content: string,
  options?: JSZip.JSZipFileOptions,
): void {
  zip.file(path, encodeHwpxUtf8(content), { ...options, binary: true })
}

function linesegarrayXml(charHeight = 1000, vertpos = 0): string {
  const baseline = Math.floor(charHeight * 0.85)
  return `<hp:linesegarray><hp:lineseg textpos="0" vertpos="${vertpos}" vertsize="${charHeight}" textheight="${charHeight}" baseline="${baseline}" spacing="160" horzpos="0" horzsize="${HWPX_LINE_AREA}" flags="393216"/></hp:linesegarray>`
}

export function stripHtml(html: string): string {
  if (!html) return ""
  if (typeof document !== "undefined") {
    const el = document.createElement("div")
    el.innerHTML = html
    return sanitizeHwpxText((el.textContent ?? el.innerText ?? "").trim())
  }
  const decoded = decodeHtmlEntities(html)
  return sanitizeHwpxText(
    decoded
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
}

function paragraphXml(
  text: string,
  options?: { variant?: HwpxParagraph["variant"] },
): string {
  const variant = options?.variant ?? "body"
  const styleId =
    variant === "title"
      ? HWPX_STYLE.title
      : variant === "heading"
        ? HWPX_STYLE.heading
        : HWPX_STYLE.body
  const paraId =
    variant === "title"
      ? HWPX_PARA.center
      : variant === "heading"
        ? HWPX_PARA.heading
        : HWPX_PARA.body
  const charId =
    variant === "title"
      ? HWPX_CHAR.title
      : variant === "heading"
        ? HWPX_CHAR.heading
        : HWPX_CHAR.body

  const runs = hpTextRuns(charId, text)

  const charHeight =
    variant === "title" ? 1800 : variant === "heading" ? 1200 : 1000

  return `<hp:p id="${nextParaId()}" paraPrIDRef="${paraId}" styleIDRef="${styleId}" pageBreak="0" columnBreak="0" merged="0">${runs}${linesegarrayXml(charHeight)}</hp:p>`
}

type GridCell = HwpxTableCell | null

function buildCellGrid(rows: HwpxTableCell[][]): {
  grid: GridCell[][]
  rowCnt: number
  colCnt: number
} {
  const grid: GridCell[][] = []
  let colCnt = 0

  for (let r = 0; r < rows.length; r++) {
    if (!grid[r]) grid[r] = []
    let c = 0
    for (const cell of rows[r]) {
      while (grid[r][c] !== undefined && grid[r][c] !== null) c++
      const colSpan = cell.colSpan ?? 1
      const rowSpan = cell.rowSpan ?? 1
      colCnt = Math.max(colCnt, c + colSpan)
      grid[r][c] = cell
      for (let dr = 0; dr < rowSpan; dr++) {
        for (let dc = 0; dc < colSpan; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (!grid[rr]) grid[rr] = []
          grid[rr][cc] = null
        }
      }
      c += colSpan
    }
  }

  const rowCnt = grid.length
  return { grid, rowCnt, colCnt: colCnt || 1 }
}

function defaultColWidths(colCnt: number): number[] {
  const total = 42520
  const base = Math.floor(total / colCnt)
  return Array.from({ length: colCnt }, (_, i) =>
    i === colCnt - 1 ? total - base * (colCnt - 1) : base,
  )
}

function tableXml(table: HwpxTable): string {
  const { grid, rowCnt, colCnt } = buildCellGrid(table.rows)
  const colWidths = table.colWidths ?? defaultColWidths(colCnt)
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)
  const rowHeight = 2800
  const tableHeight = rowHeight * rowCnt
  const tblId = nextTblId()

  const rowXml = grid
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => {
          if (cell === null) return ""
          const colSpan = cell.colSpan ?? 1
          const rowSpan = cell.rowSpan ?? 1
          let cellWidth = 0
          for (let c = colIndex; c < colIndex + colSpan; c++) {
            cellWidth += colWidths[c] ?? 0
          }
          const borderId = resolveCellBorderId(cell)
          const charId = resolveCellCharId(cell)
          const paraId = cell.header ? HWPX_PARA.center : HWPX_PARA.body
          const styleId = cell.header ? HWPX_STYLE.label : HWPX_STYLE.body
          const runs = hpTextRuns(charId, cell.text || " ")

          const cellCharHeight = cell.fontSizePx
            ? fontSizePxToHeight(cell.fontSizePx)
            : cell.header
              ? 900
              : 1000
          const cellPara = `<hp:p id="${nextParaId()}" paraPrIDRef="${paraId}" styleIDRef="${styleId}" pageBreak="0" columnBreak="0" merged="0">${runs}${linesegarrayXml(cellCharHeight)}</hp:p>`

          return `<hp:tc name="" header="${cell.header ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${borderId}">
  <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">
    ${cellPara}
  </hp:subList>
  <hp:cellAddr colAddr="${colIndex}" rowAddr="${rowIndex}"/>
  <hp:cellSpan colSpan="${colSpan}" rowSpan="${rowSpan}"/>
  <hp:cellSz width="${cellWidth}" height="${rowHeight * rowSpan}"/>
  <hp:cellMargin left="510" right="510" top="284" bottom="284"/>
</hp:tc>`
        })
        .join("")
      return `<hp:tr>${cells}</hp:tr>`
    })
    .join("")

  return `<hp:tbl id="${tblId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" cellSpacing="0" colCnt="${colCnt}" rowCnt="${rowCnt}" borderFillIDRef="${HWPX_BORDER.table}" noAdjust="0">
  <hp:sz width="${tableWidth}" widthRelTo="ABSOLUTE" height="${tableHeight}" heightRelTo="ABSOLUTE" protect="0"/>
  <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
  <hp:outMargin left="283" right="283" top="283" bottom="283"/>
  <hp:inMargin left="141" right="141" top="141" bottom="141"/>
  ${rowXml}
</hp:tbl>`
}

/** 표는 hp:p > hp:run 안에 넣어야 한글에서 정상 열림 */
function paragraphWithTable(table: HwpxTable): string {
  const tbl = tableXml(table)
  const charHeight = 1000
  return `<hp:p id="${nextParaId()}" paraPrIDRef="${HWPX_PARA.body}" styleIDRef="${HWPX_STYLE.body}" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="${HWPX_CHAR.body}">${tbl}</hp:run>
  ${linesegarrayXml(charHeight, table.rows.length * 2800)}
</hp:p>`
}

function buildSection0Xml(sections: HwpxSection[]): string {
  const parts: string[] = [buildSectionOpenParagraph()]

  for (const section of sections) {
    if (section.title) {
      parts.push(paragraphXml(section.title, { variant: "title" }))
    }
    for (const table of section.tables ?? []) {
      parts.push(paragraphWithTable(table))
    }
    for (const para of section.paragraphs ?? []) {
      if (!para.text.trim()) continue
      parts.push(
        paragraphXml(para.text, {
          variant: para.variant ?? "body",
        }),
      )
    }
  }

  if (parts.length === 1) {
    parts.push(paragraphXml(" "))
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">
${parts.join("\n")}
</hs:sec>`
}

function buildContentHpf(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:package xmlns:opf="urn:oasis:names:tc:opendocument:xmlns:package"
             xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
             xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"
             version="1.5"
             unique-identifier="bookid">
  <opf:metadata>
    <ha:title>${escapeXml(title)}</ha:title>
    <ha:subject>사업문서</ha:subject>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="header.xml" media-type="application/hwpml-head+xml"/>
    <opf:item id="section0" href="section0.xml" media-type="application/hwpml-section+xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="section0"/>
  </opf:spine>
</opf:package>`
}

function buildPreviewText(doc: HwpxDocument): string {
  return doc.sections
    .flatMap((s) => [
      s.title ?? "",
      ...(s.paragraphs?.map((p) => p.text) ?? []),
      ...(s.tables?.flatMap((t) =>
        t.rows.flatMap((row) => row.map((c) => c.text)),
      ) ?? []),
    ])
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000)
}

/** HWPX(ZIP+OWPML) Blob 생성 */
export async function buildHwpxBlob(doc: HwpxDocument): Promise<Blob> {
  resetIds()
  const zip = new JSZip()
  const title = doc.title || "문서"

  // section0을 먼저 만들어 동적 charPr/borderFill(셀색·글자크기)을 수집한 뒤
  // header.xml에 해당 정의를 주입한다.
  const section0Xml = buildSection0Xml(doc.sections)
  const headerExtras = {
    charProps: [...resources.charProps.values()].map((entry) => entry.xml),
    borderFills: [...resources.borderFills.values()].map((entry) => entry.xml),
  }

  addUtf8File(zip, "mimetype", "application/hwp+zip", { compression: "STORE" })
  addUtf8File(zip, "META-INF/container.xml", buildContainerXml())
  addUtf8File(zip, "META-INF/manifest.xml", buildManifestXml())
  addUtf8File(zip, "version.xml", buildVersionXml())
  addUtf8File(zip, "settings.xml", buildSettingsXml())
  addUtf8File(zip, "Contents/content.hpf", buildContentHpf(title))
  addUtf8File(zip, "Contents/header.xml", buildHeaderXml(title, headerExtras))
  addUtf8File(zip, "Contents/section0.xml", section0Xml)
  addUtf8File(zip, "Meta/meta.xml", buildMetaXml(title))
  addUtf8File(zip, "Preview/PrvText.txt", `\uFEFF${buildPreviewText(doc)}`)

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/hwp+zip",
    compression: "DEFLATE",
  })
}

export function downloadHwpxFile(filename: string, blob: Blob): void {
  const safeName = sanitizeHwpxText(filename)
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = safeName.endsWith(".hwpx") ? safeName : `${safeName}.hwpx`
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  window.setTimeout(() => {
    anchor.remove()
    URL.revokeObjectURL(url)
  }, 5000)
}

export async function downloadHwpxDocument(
  filename: string,
  doc: HwpxDocument,
): Promise<void> {
  const blob = await buildHwpxBlob(doc)
  downloadHwpxFile(filename, blob)
}

/** 2열 요약표 (항목 | 내용) */
export function summaryTableRows(
  pairs: [string, string][],
): HwpxTableCell[][] {
  return pairs.map(([label, value]) => [
    { text: label, header: true },
    { text: value || "-" },
  ])
}

/** 4열 폼표 (라벨 | 값 | 라벨 | 값) */
export function formTableRow(
  a: [string, string],
  b: [string, string],
): HwpxTableCell[] {
  return [
    { text: a[0], header: true },
    { text: a[1] || "-" },
    { text: b[0], header: true },
    { text: b[1] || "-" },
  ]
}

export const HWPX_COL = {
  label2: [9000, 33520] as number[],
  form4: [7500, 13760, 7500, 13760] as number[],
  sub2: [10000, 32520] as number[],
  purpose3: [10000, 10840, 10840, 10840] as number[],
} as const
