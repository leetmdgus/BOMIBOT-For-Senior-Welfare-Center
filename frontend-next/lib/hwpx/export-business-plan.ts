import { hwpxSectionsFromDocumentSections } from "@/lib/hwpx/export-sections"
import {
  downloadHwpxDocument,
  HWPX_COL,
  summaryTableRows,
  type HwpxDocument,
  type HwpxSection,
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
              formData.goals.filter(Boolean).map((goal) => `• ${goal}`).join("\n"),
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
    ...hwpxSectionsFromDocumentSections(sections, { formData }),
  ]

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
