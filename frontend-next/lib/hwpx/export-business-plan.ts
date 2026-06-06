import { shouldUseMockApi } from "@/lib/api-service-mode"
import { documentSectionsForHwpxExport, mergeFlushedDocumentSections } from "@/lib/hwpx/document-sections-for-export"
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
import { buildHwpxDownloadFilename } from "@/lib/hwpx/hwpx-filename"
import { downloadBusinessPlanHwpx as downloadFromApi } from "@/services/kanban.task-detail.service"
import type {
  BusinessPlanFormData,
  BusinessPlanSection,
} from "@/services/kanban.task-detail.types"

function documentSectionsForHwpx(
  sections: BusinessPlanSection[],
): BusinessPlanSection[] {
  return documentSectionsForHwpxExport(sections) as BusinessPlanSection[]
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
    ...hwpxSectionsFromDocumentSections(
      documentSectionsForHwpx(sections),
      { formData },
    ),
  ]

  return {
    title: formData.projectName || "사업계획서",
    sections: docSections,
  }
}

export async function downloadBusinessPlanHwpx(
  taskId: string,
  formData: BusinessPlanFormData,
  sections: BusinessPlanSection[],
  templateId?: string | null,
): Promise<void> {
  const exportSections = documentSectionsForHwpx(
    mergeFlushedDocumentSections(sections),
  )

  if (!shouldUseMockApi() && downloadFromApi) {
    await downloadFromApi(taskId, {
      formData,
      sections: exportSections,
      templateId,
    })
    return
  }

  const doc = buildBusinessPlanHwpx(formData, exportSections)
  const filename = buildHwpxDownloadFilename(
    formData.projectName,
    "plan",
    formData.period,
  )
  await downloadHwpxDocument(
    filename.replace(/\.hwpx$/i, ""),
    doc,
  )
}
