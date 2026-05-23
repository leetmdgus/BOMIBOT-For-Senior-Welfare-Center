import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"

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
import { parseTableSectionContent } from "@/lib/business-plan-table-utils"
import {
  formatLineSlotText,
  lineSlotDisplayValue,
  parseLineSlots,
} from "@/lib/line-slot-utils"
import type {
  BusinessEvaluationData,
  BusinessPlanFormData,
} from "@/services/kanban.task-detail.types"

function slotLines(value: string): string {
  const lines = parseLineSlots(value)
  const raw = lines.length > 0 ? lines.join("\n") : lineSlotDisplayValue(value)
  return formatLineSlotText(raw)
}

function formatEvalDate(iso: string): string {
  if (!iso?.trim()) return "-"
  try {
    return format(parseISO(iso), "yyyy.MM.dd", { locale: ko })
  } catch {
    return iso
  }
}

function planReferenceSection(form: BusinessPlanFormData): HwpxSection {
  return {
    title: "사업계획서 (참고)",
    tables: [
      {
        colWidths: [...HWPX_COL.label2],
        rows: summaryTableRows([
          ["사업명", form.projectName],
          ["목적", slotLines(form.purpose) || "-"],
          ["목표", form.goals.filter(Boolean).map((g) => `• ${g}`).join("\n") || "-"],
          ["사업기간", form.period],
          ["대상", form.target],
          ["총인원(명/회)", form.totalCount],
          ["예산(원)", form.budget],
          ["예산과목", form.budgetCategory],
          ["담당자", form.manager],
        ]),
      },
    ],
  }
}

/** 화면 최종사업평가서 요약표와 동일한 4열·병합 구조 */
function evaluationSummaryTable(
  evaluation: BusinessEvaluationData,
): HwpxTable {
  const evalDate = formatEvalDate(evaluation.evaluationDate)
  const goalsText =
    evaluation.goals.filter(Boolean).map((g) => `• ${g}`).join("\n") || "-"

  const rows: HwpxTableCell[][] = [
    formTableRow(
      ["사업팀", evaluation.team],
      ["담당자", evaluation.manager],
    ),
    formTableRow(
      ["사업기간", evaluation.period],
      ["평가일", evalDate],
    ),
    formTableRow(
      ["프로그램명", evaluation.programName],
      ["대상", evaluation.target],
    ),
    formTableRow(
      ["계획\n인원(명/회)", evaluation.planCount],
      ["예산(원)", evaluation.planBudget],
    ),
    formTableRow(
      ["실행\n인원(명/회)", evaluation.actualCount],
      ["지출(원)", evaluation.actualExpense],
    ),
    formTableRow(
      ["목적", slotLines(evaluation.purpose)],
      ["목표", goalsText],
    ),
    formTableRow(
      ["성과지표", slotLines(evaluation.performanceIndicator)],
      ["평가도구", slotLines(evaluation.evaluationTool)],
    ),
    [
      { text: "프로그램\n평가", header: true, rowSpan: 3 },
      { text: "성과 주요 요인 분석", header: true },
      { text: slotLines(evaluation.keyFactorAnalysis), colSpan: 2 },
    ],
    [
      { text: "목표 적절성", header: true },
      { text: slotLines(evaluation.goalAppropriacy), colSpan: 2 },
    ],
    [
      { text: "제언 및 향후 계획", header: true },
      { text: slotLines(evaluation.suggestion), colSpan: 2 },
    ],
    [
      { text: "슈퍼비전", header: true, colSpan: 4 },
    ],
    [
      {
        text: slotLines(evaluation.supervision),
        colSpan: 4,
      },
    ],
  ]

  if (evaluation.detailRows.length > 0) {
    rows.push(
      [{ text: "세부 항목", header: true, colSpan: 4 }],
      ...evaluation.detailRows.map((row) => [
        { text: row.label, header: true, colSpan: 1 },
        { text: row.content || "-", colSpan: 3 },
      ]),
    )
  }

  return {
    colWidths: [...HWPX_COL.form4],
    rows,
  }
}

export function buildBusinessEvaluationHwpx(
  evaluation: BusinessEvaluationData,
  planForm?: BusinessPlanFormData | null,
): HwpxDocument {
  const sections: HwpxSection[] = []

  if (planForm?.projectName || planForm?.purpose) {
    sections.push(planReferenceSection(planForm))
  }

  const title = evaluation.programName
    ? `${evaluation.programName} 최종사업평가서`
    : "최종사업평가서"

  sections.push({
    title,
    tables: [evaluationSummaryTable(evaluation)],
    paragraphs: [],
  })

  const bodySections: HwpxSection[] = []
  for (const section of evaluation.sections) {
    if (section.type === "heading") {
      bodySections.push({
        title: section.title || "대목차",
        paragraphs: [{ text: section.title, variant: "heading" }],
      })
      continue
    }
    if (section.type === "table") {
      const data = parseTableSectionContent(section.content)
      if (data.preset === "custom") {
        const rows: HwpxTableCell[][] = data.rows.map((row, rowIndex) =>
          row.map((text) => ({
            text: text || "-",
            header: rowIndex < data.headerRowCount,
          })),
        )
        bodySections.push({
          title: section.title || "표",
          tables: [{ colWidths: [...HWPX_COL.sub2], rows }],
        })
      }
      continue
    }
    if (section.type === "body") {
      const html = section.content ?? ""
      const blocks = htmlToHwpxBlocks(html)
      const block: HwpxSection = {
        title: section.title?.trim() || "본문",
        paragraphs: [],
        tables: [...blocks.tables],
      }
      if (section.title?.trim()) {
        block.paragraphs?.push({ text: section.title, variant: "heading" })
      }
      if (blocks.paragraphs.length > 0) {
        block.paragraphs?.push(...blocks.paragraphs)
      } else {
        const plain = stripHtml(html)
        if (plain) block.paragraphs?.push({ text: plain, variant: "body" })
      }
      if ((block.paragraphs?.length ?? 0) > 0 || (block.tables?.length ?? 0) > 0) {
        bodySections.push(block)
      }
    }
  }

  sections.push(...bodySections)

  return {
    title,
    sections,
  }
}

export async function downloadBusinessEvaluationHwpx(
  evaluation: BusinessEvaluationData,
  planForm?: BusinessPlanFormData | null,
): Promise<void> {
  const doc = buildBusinessEvaluationHwpx(evaluation, planForm)
  const baseName = evaluation.programName || "사업평가서"
  await downloadHwpxDocument(baseName, doc)
}
