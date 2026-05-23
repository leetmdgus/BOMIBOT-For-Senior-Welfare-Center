import {
  parseTableSectionContent,
  type BusinessPlanCustomTableData,
} from "@/lib/business-plan-table-utils"
import { htmlToHwpxBlocks } from "@/lib/hwpx/html-to-hwpx"
import {
  HWPX_COL,
  stripHtml,
  type HwpxSection,
  type HwpxTable,
  type HwpxTableCell,
} from "@/lib/hwpx/hwpx-builder"
import { buildPurposeGoalsHwpxTable } from "@/lib/hwpx/purpose-goals-hwpx-table"
import type {
  BusinessPlanFormData,
  BusinessPlanSection,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

function customTableToHwpx(data: BusinessPlanCustomTableData): HwpxTable {
  const rows: HwpxTableCell[][] = data.rows.map((row, rowIndex) =>
    row.map((text) => ({
      text: text || "-",
      header: rowIndex < data.headerRowCount,
    })),
  )
  return {
    colWidths: [...HWPX_COL.sub2],
    rows,
  }
}

function bodySectionFromHtml(
  html: string,
  title?: string,
): HwpxSection | null {
  const blocks = htmlToHwpxBlocks(html)
  const section: HwpxSection = {
    paragraphs: [],
    tables: [...blocks.tables],
  }
  if (title?.trim()) {
    section.paragraphs?.push({ text: title, variant: "heading" })
  }
  if (blocks.paragraphs.length > 0) {
    section.paragraphs?.push(...blocks.paragraphs)
  } else {
    const plain = stripHtml(html)
    if (plain) section.paragraphs?.push({ text: plain, variant: "body" })
  }
  if (
    (section.paragraphs?.length ?? 0) === 0 &&
    (section.tables?.length ?? 0) === 0
  ) {
    return null
  }
  return section
}

function tableSectionFromPlanSection(
  section: BusinessPlanSection | EvaluationSection,
  formData?: BusinessPlanFormData | null,
): HwpxSection | null {
  const data = parseTableSectionContent(section.content)
  const paragraphs =
    section.title?.trim() ?
      [{ text: section.title, variant: "heading" as const }]
    : []

  if (data.preset === "purpose-goals") {
    if (!formData) return null
    const table = buildPurposeGoalsHwpxTable(formData)
    if (!table) return null
    return { paragraphs, tables: [table] }
  }

  return {
    title: section.title || "표",
    paragraphs,
    tables: [customTableToHwpx(data)],
  }
}

type DocumentSection = BusinessPlanSection | EvaluationSection

/** 문서 섹션 배열 → HWPX 섹션 (화면 순서 유지) */
export function hwpxSectionsFromDocumentSections(
  sections: DocumentSection[],
  options?: { formData?: BusinessPlanFormData | null },
): HwpxSection[] {
  const result: HwpxSection[] = []

  for (const section of sections) {
    if (section.type === "file") continue

    if (section.type === "heading") {
      result.push({
        paragraphs: [{ text: section.title || "대목차", variant: "heading" }],
      })
      continue
    }

    if (section.type === "table") {
      const block = tableSectionFromPlanSection(section, options?.formData)
      if (block) result.push(block)
      continue
    }

    if (section.type === "body") {
      const block = bodySectionFromHtml(section.content ?? "", section.title)
      if (block) result.push(block)
    }
  }

  return result
}
