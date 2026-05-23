import {
  parseTableSectionContent,
  type BusinessPlanCustomTableData,
} from "@/lib/business-plan-table-utils"
import { htmlToHwpxBlocks } from "@/lib/hwpx/html-to-hwpx"
import {
  downloadHwpxDocument,
  formTableRow,
  HWPX_COL,
  stripHtml,
  summaryTableRows,
  type HwpxDocument,
  type HwpxSection,
  type HwpxTable,
  type HwpxTableCell,
} from "@/lib/hwpx/hwpx-builder"
import {
  formatLineSlotText,
  lineSlotDisplayValue,
  parseLineSlots,
} from "@/lib/line-slot-utils"
import type {
  BusinessPlanFormData,
  BusinessPlanSection,
} from "@/services/kanban.task-detail.types"

const SUB_DETAIL_LABELS: { key: keyof BusinessPlanFormData["subProjects"][0]; label: string }[] = [
  { key: "purpose", label: "목적" },
  { key: "content", label: "내용" },
  { key: "target", label: "대상" },
  { key: "period", label: "기간" },
  { key: "operatingMethod", label: "운영방법" },
  { key: "evaluationMethod", label: "평가방법" },
]

function purposeGoalsTable(formData: BusinessPlanFormData): HwpxTable | null {
  if (formData.subProjects.length === 0) return null

  const purposeText =
    formatLineSlotText(
      parseLineSlots(formData.purpose).join("\n") ||
        lineSlotDisplayValue(formData.purpose),
    ) || "-"
  const goalsText =
    formData.goals.filter(Boolean).map((g) => `• ${g}`).join("\n") || "-"

  const bodyRows = formData.subProjects.map((sub, index) => {
    const cells: HwpxTableCell[] = []
    if (index === 0) {
      cells.push({ text: purposeText, rowSpan: formData.subProjects.length })
    }
    cells.push(
      { text: sub.output || "-" },
      { text: sub.outcome || "-" },
    )
    return cells
  })

  return {
    colWidths: [...HWPX_COL.purpose3],
    rows: [
      [
        { text: "목적", header: true, rowSpan: 2 },
        { text: "목표", header: true, colSpan: 2 },
      ],
      [
        { text: "산출목표", header: true },
        { text: "성과목표", header: true },
      ],
      ...bodyRows,
    ],
  }
}

function subProjectTables(formData: BusinessPlanFormData): HwpxTable[] {
  return formData.subProjects.map((sub) => ({
    colWidths: [...HWPX_COL.sub2],
    rows: [
      [
        { text: "항목", header: true },
        { text: sub.name, header: true },
      ],
      ...SUB_DETAIL_LABELS.map(({ key, label }) => {
        const raw =
          (sub as Record<string, string | undefined>)[key] ??
          (key === "content" ? sub.output : "") ??
          ""
        const text =
          key === "purpose" ||
          key === "content" ||
          key === "operatingMethod" ||
          key === "evaluationMethod"
            ? formatLineSlotText(raw)
            : raw || "-"
        return [
          { text: label, header: true },
          { text },
        ]
      }),
    ],
  }))
}

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

export function buildBusinessPlanHwpx(
  formData: BusinessPlanFormData,
  sections: BusinessPlanSection[],
): HwpxDocument {
  const docSections: HwpxSection[] = [
    {
      title: "사회복지사업 단위사업계획서",
      tables: [
        {
          colWidths: [...HWPX_COL.label2],
          rows: summaryTableRows([
            ["사 업 명", formData.projectName],
            [
              "목 적",
              formatLineSlotText(
                parseLineSlots(formData.purpose).join("\n") ||
                  lineSlotDisplayValue(formData.purpose),
              ),
            ],
            [
              "목 표",
              formData.goals.filter(Boolean).map((g) => `• ${g}`).join("\n"),
            ],
            ["사 업 기 간", formData.period],
            ["사 업 대 상", formData.target],
            ["연인원수/횟수", formData.totalCount],
            ["소요예산(원)", formData.budget],
            ["예산과목", formData.budgetCategory],
            ["담 당", formData.manager],
          ]),
        },
      ],
    },
  ]

  const matrix = purposeGoalsTable(formData)
  if (matrix) {
    docSections.push({
      title: "목적·목표·세부사업",
      tables: [matrix],
    })
  }

  const subTables = subProjectTables(formData)
  if (subTables.length > 0) {
    docSections.push({
      title: "세부사업",
      tables: subTables,
    })
  }

  const extraSections: HwpxSection[] = []

  for (const section of sections) {
    if (section.type === "heading") {
      extraSections.push({
        title: section.title || "대목차",
        paragraphs: [{ text: section.title, variant: "heading" }],
      })
      continue
    }
    if (section.type === "table") {
      const data = parseTableSectionContent(section.content)
      if (data.preset === "custom") {
        extraSections.push({
          title: section.title || "표",
          tables: [customTableToHwpx(data)],
        })
      }
      continue
    }
    if (section.type === "body") {
      const html = section.content ?? ""
      const blocks = htmlToHwpxBlocks(html)
      const sectionBlocks: HwpxSection = {
        title: section.title?.trim() || "본문",
        paragraphs: [],
        tables: [...blocks.tables],
      }
      if (section.title?.trim()) {
        sectionBlocks.paragraphs?.push({
          text: section.title,
          variant: "heading",
        })
      }
      if (blocks.paragraphs.length > 0) {
        sectionBlocks.paragraphs?.push(...blocks.paragraphs)
      } else {
        const plain = stripHtml(html)
        if (plain) {
          sectionBlocks.paragraphs?.push({ text: plain, variant: "body" })
        }
      }
      if (
        (sectionBlocks.paragraphs?.length ?? 0) > 0 ||
        (sectionBlocks.tables?.length ?? 0) > 0
      ) {
        extraSections.push(sectionBlocks)
      }
    }
  }

  docSections.push(...extraSections)

  return {
    title: formData.projectName || "사업계획서",
    sections: docSections,
  }
}

export async function downloadBusinessPlanHwpx(
  formData: BusinessPlanFormData,
  sections: BusinessPlanSection[],
): Promise<void> {
  const doc = buildBusinessPlanHwpx(formData, sections)
  const baseName = formData.projectName || "사업계획서"
  await downloadHwpxDocument(baseName, doc)
}
