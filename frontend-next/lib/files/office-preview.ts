import JSZip from "jszip"
import * as XLSX from "xlsx"

import { getClientSession } from "@/lib/auth/session"
import { isFastApiMode, resolveApiPath } from "@/lib/api-client"
import {
  HWPX_PREVIEW_THEME_CSS,
  OFFICE_HWPX_PREVIEW_CSS,
} from "@/lib/hwp-ast/preview-theme"
import { createSampleOfficeBlob } from "@/lib/files/sample-office-blob"
import { shouldUseMockApi } from "@/lib/api-service-mode"
import { downloadFileBlob } from "@/services/files.service"

const OFFICE_EXT = /\.(xlsx|xls|csv|hwpx|docx)$/i

const OFFICE_MIME_PREFIXES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/hwp+zip",
  "application/vnd.hancom.hwpx",
]

export function isOfficePreviewableFile(
  name: string,
  fileType?: string,
  mimeType?: string,
): boolean {
  const lower = name.toLowerCase()
  const mime = (mimeType ?? "").toLowerCase()

  if (OFFICE_EXT.test(lower)) return true
  if (OFFICE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return true
  }
  if (mime.includes("spreadsheet") || mime.includes("excel")) return true
  if (mime.includes("wordprocessing") || mime === "application/msword") {
    return lower.endsWith(".doc")
      ? false
      : true
  }
  if (fileType === "spreadsheet") {
    return true
  }
  if (fileType === "document" && /\.docx$/i.test(lower)) return true
  return false
}

function previewApiPath(fileId: string): string {
  return resolveApiPath(
    `/api/files/${encodeURIComponent(fileId)}/preview`,
    `/api/v1/files/${encodeURIComponent(fileId)}/preview`,
  )
}

function authHeaders(): HeadersInit {
  const session = getClientSession()
  const headers: Record<string, string> = {}
  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  if (session?.regionId) headers["X-Region-Id"] = session.regionId
  return headers
}

async function parsePreviewApiError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "")
  try {
    const json = JSON.parse(text) as {
      detail?: string | Array<{ msg?: string }>
      error?: string
    }
    if (typeof json.detail === "string" && json.detail.trim()) {
      return json.detail
    }
    if (Array.isArray(json.detail)) {
      const parts = json.detail
        .map((item) => item.msg)
        .filter((msg): msg is string => Boolean(msg?.trim()))
      if (parts.length > 0) return parts.join(", ")
    }
    if (typeof json.error === "string" && json.error.trim()) {
      return json.error
    }
  } catch {
    /* plain text body */
  }
  if (text.trim()) return text.trim()
  return `미리보기 실패 (${response.status})`
}

async function fetchPreviewHtmlFromApi(fileId: string): Promise<string> {
  const response = await fetch(previewApiPath(fileId), {
    credentials: "include",
    headers: authHeaders(),
  })
  if (!response.ok) {
    throw new Error(await parsePreviewApiError(response))
  }
  const data = (await response.json()) as { html?: string }
  if (!data.html?.trim()) {
    throw new Error("미리보기 HTML이 비어 있습니다.")
  }
  return data.html
}

function stripHtmlWrapper(fragment: string): string {
  return fragment
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim()
}

async function renderHwpxClient(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const sectionPaths = Object.keys(zip.files)
    .filter((path) => /^Contents\/section\d+\.xml$/i.test(path.replace(/\\/g, "/")))
    .sort()

  const parser = new DOMParser()
  const HP_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
  const blocks: string[] = []

  const isInsideTable = (node: Element): boolean => {
    let parent = node.parentElement
    while (parent) {
      if (parent.localName === "tbl" && parent.namespaceURI === HP_NS) {
        return true
      }
      parent = parent.parentElement
    }
    return false
  }

  const hpText = (elem: Element): string => {
    const parts: string[] = []
    const texts = elem.getElementsByTagNameNS(HP_NS, "t")
    for (let t = 0; t < texts.length; t++) {
      const node = texts.item(t)
      if (node?.textContent) parts.push(node.textContent)
    }
    return parts.join("")
  }

  const cellBackground = (
    tc: Element,
    colIdx: number,
    colCnt: number,
  ): string | null => {
    const ref = tc.getAttribute("borderFillIDRef")
    if (ref === "4") return "#D9D9D9"
    if (ref === "2" || ref === "3" || ref === "5") return "#FFFFFF"
    if (tc.getAttribute("header") === "1") return "#ECECEC"
    if (colCnt >= 2 && colIdx === 0) return "#D9D9D9"
    if (colCnt >= 2 && colIdx > 0) return "#FFFFFF"
    return null
  }

  const hwpxTableHtml = (tbl: Element): string => {
    const colCnt = Number.parseInt(tbl.getAttribute("colCnt") || "0", 10)
    const rowsHtml: string[] = []
    const rows = tbl.getElementsByTagNameNS(HP_NS, "tr")
    for (let r = 0; r < rows.length; r++) {
      const tr = rows.item(r)
      if (!tr) continue
      const cells = tr.getElementsByTagNameNS(HP_NS, "tc")
      const cellsHtml: string[] = []
      for (let c = 0; c < cells.length; c++) {
        const tc = cells.item(c)
        if (!tc) continue
        const text = hpText(tc).trim() || " "
        const isHeader = tc.getAttribute("header") === "1"
        const isLabelCol = colCnt >= 2 && c === 0
        const tag = isHeader || isLabelCol ? "th" : "td"
        const cssClass =
          isHeader || isLabelCol
            ? "hwpx-doc__label"
            : colCnt >= 2 && c > 0
              ? "hwpx-doc__value"
              : ""
        const bg = cellBackground(tc, c, colCnt)
        const styleAttr = bg ? ` style="background-color:${bg}"` : ""
        const classAttr = cssClass ? ` class="${cssClass}"` : ""
        cellsHtml.push(
          `<${tag}${classAttr}${styleAttr}>${escapeHtml(text)}</${tag}>`,
        )
      }
      if (cellsHtml.length > 0) {
        rowsHtml.push(`<tr>${cellsHtml.join("")}</tr>`)
      }
    }
    if (rowsHtml.length === 0) return ""
    return (
      `<div class="hwpx-doc__table-wrap">` +
      `<table class="hwpx-doc__table">${rowsHtml.join("")}</table>` +
      `</div>`
    )
  }

  for (const path of sectionPaths) {
    const xml = await zip.file(path)?.async("string")
    if (!xml) continue
    const doc = parser.parseFromString(xml, "application/xml")
    const sectionRoot = doc.documentElement
    const paragraphs = sectionRoot.getElementsByTagNameNS(HP_NS, "p")
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs.item(i)
      if (!para || isInsideTable(para)) continue

      const tables = para.getElementsByTagNameNS(HP_NS, "tbl")
      if (tables.length > 0) {
        for (let j = 0; j < tables.length; j++) {
          const tbl = tables.item(j)
          if (tbl) {
            const html = hwpxTableHtml(tbl)
            if (html) blocks.push(html)
          }
        }
        continue
      }

      const text = hpText(para).trim()
      if (text) {
        blocks.push(`<p>${escapeHtml(text)}</p>`)
      }
    }
  }

  if (blocks.length === 0) {
    return '<p class="office-preview-empty">본문을 표시할 수 없습니다.</p>'
  }
  return `<div class="hwpx-doc hwpx-doc--preview">${blocks.join("")}</div>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

async function renderDocxClient(blob: Blob): Promise<string> {
  const mammoth = await import("mammoth")
  const buffer = await blob.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  const html = result.value?.trim()
  if (!html) {
    return '<p class="office-preview-empty">내용이 없습니다.</p>'
  }
  return `<div class="office-preview-docx">${html}</div>`
}

async function renderExcelClient(blob: Blob, name: string): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    codepage: 65001,
  })
  const parts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const tableHtml = XLSX.utils.sheet_to_html(sheet, { id: "office-preview-sheet" })
    parts.push(`<h3>${escapeHtml(sheetName)}</h3>${tableHtml}`)
  }
  if (parts.length === 0) {
    return '<p class="office-preview-empty">시트가 없습니다.</p>'
  }
  if (name.toLowerCase().endsWith(".csv") && parts.length === 1) {
    return parts[0] ?? ""
  }
  return parts.join("")
}

async function renderOfficePreviewClient(
  blob: Blob,
  name: string,
): Promise<string> {
  const lower = name.toLowerCase()
  if (lower.endsWith(".hwpx")) {
    return renderHwpxClient(blob)
  }
  if (lower.endsWith(".docx")) {
    return renderDocxClient(blob)
  }
  if (/\.(xlsx|xls|csv)$/i.test(lower)) {
    return renderExcelClient(blob, name)
  }
  throw new Error("미리보기를 지원하지 않는 형식입니다.")
}

async function resolveOfficePreviewBlob(
  fileId: string,
  options: {
    name: string
    hasContent?: boolean
    contentMissing?: boolean
  },
): Promise<Blob> {
  if (options.contentMissing) {
    throw new Error(
      "파일 본문을 찾을 수 없습니다. 서버 저장소가 초기화되었을 수 있습니다. 파일 관리에서 다시 업로드해 주세요.",
    )
  }

  const canUseSample =
    shouldUseMockApi() &&
    isOfficePreviewableFile(options.name) &&
    options.hasContent !== true

  if (downloadFileBlob) {
    try {
      return await downloadFileBlob(fileId)
    } catch (error) {
      if (canUseSample) {
        const sample = await createSampleOfficeBlob(options.name)
        if (sample) return sample
      }
      if (options.hasContent === false) {
        throw new Error("업로드된 파일만 미리보기할 수 있습니다.")
      }
      throw error
    }
  }

  if (canUseSample) {
    const sample = await createSampleOfficeBlob(options.name)
    if (sample) return sample
  }

  if (options.hasContent === false) {
    throw new Error("업로드된 파일만 미리보기할 수 있습니다.")
  }

  throw new Error("파일 API를 사용할 수 없습니다.")
}

/** Excel·HWPX·DOCX HTML 미리보기 (API 우선, 실패 시 클라이언트 렌더 폴백) */
export async function loadOfficePreviewHtml(
  fileId: string,
  options: {
    name: string
    hasContent?: boolean
    contentMissing?: boolean
    mimeType?: string
  },
): Promise<string> {
  if (isFastApiMode()) {
    try {
      return await fetchPreviewHtmlFromApi(fileId)
    } catch (apiError) {
      try {
        const blob = await resolveOfficePreviewBlob(fileId, options)
        const body = await renderOfficePreviewClient(blob, options.name)
        return wrapOfficePreviewFragment(body, options.name)
      } catch {
        throw apiError
      }
    }
  }

  const blob = await resolveOfficePreviewBlob(fileId, options)
  const body = await renderOfficePreviewClient(blob, options.name)
  return wrapOfficePreviewFragment(body, options.name)
}

export function wrapOfficePreviewFragment(body: string, title: string): string {
  const inner = stripHtmlWrapper(body)
  const isHwpx =
    title.toLowerCase().endsWith(".hwpx") || inner.includes("hwpx-doc")
  const previewClass = isHwpx ? "office-preview hwpx-like" : "office-preview"
  const styles = isHwpx ? OFFICE_HWPX_PREVIEW_STYLES : OFFICE_PREVIEW_STYLES
  return `${styles}<div class="${previewClass}"><h2 class="office-preview-title">${escapeHtml(title)}</h2>${inner}</div>`
}

export function wrapOfficePreviewDocument(body: string, title: string): string {
  const fragment = wrapOfficePreviewFragment(body, title)
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head><body>${fragment}</body></html>`
}

export const OFFICE_PREVIEW_STYLES = `
<style>
  .office-preview { font-family: "Malgun Gothic", "맑은 고딕", sans-serif; font-size: 13px; color: #111; line-height: 1.5; }
  .office-preview-title { font-size: 15px; font-weight: 700; margin: 0 0 0.75rem; }
  .office-preview h3 { font-size: 14px; font-weight: 600; margin: 1rem 0 0.35rem; color: #334155; }
  .office-preview p { margin: 0.35rem 0; white-space: pre-wrap; }
  .office-preview-table, .office-preview table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 12px; }
  .office-preview-table th, .office-preview-table td,
  .office-preview table th, .office-preview table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
  .office-preview-table th, .office-preview table th { background: #f1f5f9; font-weight: 600; }
  .office-preview-empty { color: #64748b; padding: 2rem; text-align: center; }
  .office-preview-docx { max-width: 100%; }
  .office-preview-docx h1, .office-preview-docx h2, .office-preview-docx h3,
  .office-preview-docx h4, .office-preview-docx h5, .office-preview-docx h6 {
    margin: 0.75rem 0 0.35rem; font-weight: 700; line-height: 1.35;
  }
  .office-preview-docx ul, .office-preview-docx ol { margin: 0.35rem 0; padding-left: 1.5rem; }
  .office-preview-docx table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 12px; }
  .office-preview-docx table td, .office-preview-docx table th {
    border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top;
  }
  .office-preview-docx img { max-width: 100%; height: auto; }
</style>
`

export const OFFICE_HWPX_PREVIEW_STYLES = `
<style>
  .office-preview { font-family: "Malgun Gothic", "맑은 고딕", sans-serif; font-size: 13px; color: #111; line-height: 1.5; }
  .office-preview-title { font-size: 15px; font-weight: 700; margin: 0 0 0.75rem; }
  .office-preview h3 { font-size: 14px; font-weight: 600; margin: 1rem 0 0.35rem; color: #334155; }
  .office-preview-empty { color: #64748b; padding: 2rem; text-align: center; }
  ${HWPX_PREVIEW_THEME_CSS}
  ${OFFICE_HWPX_PREVIEW_CSS}
</style>
`
