import JSZip from "jszip"
import * as XLSX from "xlsx"

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** mock·데모용 최소 DOCX (mammoth 미리보기 가능) */
async function buildMinimalDocx(title: string, lines: string[]): Promise<Blob> {
  const zip = new JSZip()
  const paragraphs = [title, ...lines]
    .filter(Boolean)
    .map(
      (line) =>
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`,
    )
    .join("")

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  )
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  )
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr/></w:body>
</w:document>`,
  )
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  )

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
}

function buildMinimalXlsx(title: string, rows: string[][]): Blob {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1")
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

function buildMinimalCsv(rows: string[][]): Blob {
  const text = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n")
  return new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8" })
}

/** 예시·mock 파일 — docx/xlsx/csv 미리보기용 최소 바이너리 */
export async function createSampleOfficeBlob(filename: string): Promise<Blob | null> {
  const lower = filename.toLowerCase()
  const base = filename.replace(/\.[^.]+$/, "")

  if (lower.endsWith(".docx")) {
    return buildMinimalDocx(base, [
      "이 문서는 미리보기용 예시입니다.",
      "실제 파일을 업로드하면 원본 내용이 표시됩니다.",
    ])
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return buildMinimalXlsx(base, [
      ["항목", "내용"],
      ["문서명", base],
      ["안내", "예시 데이터 · 업로드 시 원본 표시"],
    ])
  }

  if (lower.endsWith(".csv")) {
    return buildMinimalCsv([
      ["항목", "내용"],
      ["문서명", base],
      ["안내", "예시 데이터"],
    ])
  }

  return null
}
