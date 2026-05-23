import JSZip from "jszip"

import {
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

function resetIds(): void {
  paraIdSeq = 1
  tblIdSeq = 1
}

/** XML·한글에서 깨지는 제어문자 제거 */
export function sanitizeHwpxText(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/\uFFFE|\uFFFF/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
}

export function escapeXml(value: string): string {
  return sanitizeHwpxText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

const HWPX_LINE_AREA = 42520

function linesegarrayXml(charHeight = 1000, vertpos = 0): string {
  const baseline = Math.floor(charHeight * 0.85)
  return `<hp:linesegarray><hp:lineseg textpos="0" vertpos="${vertpos}" vertsize="${charHeight}" textheight="${charHeight}" baseline="${baseline}" spacing="160" horzpos="0" horzsize="${HWPX_LINE_AREA}" flags="393216"/></hp:linesegarray>`
}

export function stripHtml(html: string): string {
  if (!html) return ""
  if (typeof document !== "undefined") {
    const el = document.createElement("div")
    el.innerHTML = html
    return (el.textContent ?? el.innerText ?? "").trim()
  }
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
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

  const safe = sanitizeHwpxText(text)
  const lines = safe.split("\n")
  const runs =
    lines.length === 0 || (lines.length === 1 && !lines[0])
      ? `<hp:run charPrIDRef="${charId}"><hp:t> </hp:t></hp:run>`
      : lines
          .map((line, index) => {
            const breakXml =
              index < lines.length - 1
                ? `<hp:run charPrIDRef="${charId}"><hp:lineBreak/></hp:run>`
                : ""
            return `<hp:run charPrIDRef="${charId}"><hp:t>${escapeXml(line || " ")}</hp:t></hp:run>${breakXml}`
          })
          .join("")

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
          const borderId = cell.header
            ? HWPX_BORDER.headerCell
            : HWPX_BORDER.table
          const charId = cell.header ? HWPX_CHAR.label : HWPX_CHAR.body
          const paraId = cell.header ? HWPX_PARA.center : HWPX_PARA.body
          const styleId = cell.header ? HWPX_STYLE.label : HWPX_STYLE.body
          const text = sanitizeHwpxText(cell.text) || " "
          const lines = text.split("\n")
          const runs = lines
            .map((line, li) => {
              const br =
                li < lines.length - 1
                  ? `<hp:run charPrIDRef="${charId}"><hp:lineBreak/></hp:run>`
                  : ""
              return `<hp:run charPrIDRef="${charId}"><hp:t>${escapeXml(line)}</hp:t></hp:run>${br}`
            })
            .join("")

          const cellCharHeight = cell.header ? 900 : 1000
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

  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" })
  zip.file("META-INF/container.xml", buildContainerXml())
  zip.file("META-INF/manifest.xml", buildManifestXml())
  zip.file("version.xml", buildVersionXml())
  zip.file("settings.xml", buildSettingsXml())
  zip.file("Contents/content.hpf", buildContentHpf(title))
  zip.file("Contents/header.xml", buildHeaderXml(title))
  zip.file("Contents/section0.xml", buildSection0Xml(doc.sections))
  zip.file("Meta/meta.xml", buildMetaXml(title))
  zip.file("Preview/PrvText.txt", buildPreviewText(doc))

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/hwp+zip",
    compression: "DEFLATE",
  })
}

export function downloadHwpxFile(filename: string, blob: Blob): void {
  const safeName = filename.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_")
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
