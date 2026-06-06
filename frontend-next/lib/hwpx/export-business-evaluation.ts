import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"

import { shouldUseMockApi } from "@/lib/api-service-mode"
import { documentSectionsForHwpxExport, mergeFlushedDocumentSections } from "@/lib/hwpx/document-sections-for-export"
import { hwpxSectionsFromDocumentSections } from "@/lib/hwpx/export-sections"
import {
  downloadHwpxDocument,
  formTableRow,
  HWPX_COL,
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
import { buildHwpxDownloadFilename } from "@/lib/hwpx/hwpx-filename"
import { toSaveBusinessEvaluationPayload } from "@/lib/kanban/evaluation-save-payload"
import { downloadBusinessEvaluationHwpx as downloadFromApi } from "@/services/kanban.task-detail.service"
import type {
  BusinessEvaluationData,
  BusinessPlanFormData,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

function documentSectionsForHwpx(
  sections: EvaluationSection[],
): EvaluationSection[] {
  return documentSectionsForHwpxExport(sections) as EvaluationSection[]
}

function slotLines(value: string): string {
  const lines = parseLineSlots(value)
  const raw = lines.length > 0 ? lines.join("\n") : lineSlotDisplayValue(value)
  return formatLineSlotText(raw)
}

function formatEvalDate(iso: string): string {
  if (!iso?.trim()) return "-"
  try {
    return format(parseISO(iso), "yyyy년 MM월 dd일", { locale: ko })
  } catch {
    return iso
  }
}

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
  ]

  rows.push(
    [{ text: "슈퍼비전", header: true, colSpan: 4 }],
    [{ text: slotLines(evaluation.supervision), colSpan: 4 }],
  )

  return {
    colWidths: [...HWPX_COL.form4],
    rows,
  }
}

export function buildBusinessEvaluationHwpx(
  evaluation: BusinessEvaluationData,
): HwpxDocument {
  const sections: HwpxSection[] = []

  const title = evaluation.programName
    ? `${evaluation.programName} 최종사업평가서`
    : "최종사업평가서"

  sections.push({
    title,
    tables: [evaluationSummaryTable(evaluation)],
    paragraphs: [],
  })

  sections.push(
    ...hwpxSectionsFromDocumentSections(
      documentSectionsForHwpx(evaluation.sections),
    ),
  )

  return {
    title,
    sections,
  }
}

export async function downloadBusinessEvaluationHwpx(
  taskId: string,
  payload?: {
    evaluation?: BusinessEvaluationData
    planForm?: BusinessPlanFormData | null
    templateId?: string | null
  },
): Promise<void> {
  const evaluation = payload?.evaluation
  const planForm = payload?.planForm ?? null
  const exportEvaluation = evaluation
    ? {
        ...toSaveBusinessEvaluationPayload(evaluation),
        sections: documentSectionsForHwpx(
          mergeFlushedDocumentSections(evaluation.sections ?? []),
        ),
      }
    : undefined

  if (!shouldUseMockApi() && downloadFromApi) {
    await downloadFromApi(taskId, {
      evaluation: exportEvaluation,
      planForm,
      templateId: payload?.templateId,
    })
    return
  }

  if (!evaluation) {
    throw new Error("evaluation data is required for mock HWPX download")
  }

  const doc = buildBusinessEvaluationHwpx({
    ...evaluation,
    sections: exportEvaluation?.sections ?? [],
  })
  const filename = buildHwpxDownloadFilename(
    evaluation.programName || planForm?.projectName,
    "evaluation",
    evaluation.period || planForm?.period,
  )
  await downloadHwpxDocument(
    filename.replace(/\.hwpx$/i, ""),
    doc,
  )
}
