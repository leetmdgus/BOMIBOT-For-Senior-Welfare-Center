import {
  formatLineSlotText,
  lineSlotDisplayValue,
  parseLineSlots,
} from "@/lib/line-slot-utils"
import {
  computeOutcomeRowSpans,
  splitSubProjectOutput,
} from "@/lib/sub-project-output-format"
import type { BusinessPlanFormData } from "@/services/kanban.task-detail.types"

import type { HwpxTable, HwpxTableCell } from "./hwpx-builder"

function formatGoalOutputText(name: string, output: string): string {
  const { title, headline, bullets } = splitSubProjectOutput(name, output)
  const lines: string[] = []
  if (title) lines.push(title)
  if (headline && headline !== title) lines.push(headline)
  for (const bullet of bullets) {
    lines.push(`• ${bullet}`)
  }
  return lines.join("\n") || "-"
}

/** 화면 목적·목표 표와 동일한 3열 HWPX 표 */
export function buildPurposeGoalsHwpxTable(
  formData: BusinessPlanFormData,
): HwpxTable | null {
  if (formData.subProjects.length === 0) return null

  const purposeText =
    formatLineSlotText(
      parseLineSlots(formData.purpose).join("\n") ||
        lineSlotDisplayValue(formData.purpose),
    ) || "-"
  const outcomeSpans = computeOutcomeRowSpans(formData.subProjects)

  const bodyRows: HwpxTableCell[][] = formData.subProjects.map((sub, index) => {
    const cells: HwpxTableCell[] = []
    if (index === 0) {
      cells.push({ text: purposeText, rowSpan: formData.subProjects.length })
    }
    cells.push({ text: formatGoalOutputText(sub.name, sub.output) })
    const span = outcomeSpans[index] ?? 1
    if (span > 0) {
      cells.push({
        text: sub.outcome?.trim() || "-",
        rowSpan: span > 1 ? span : undefined,
      })
    }
    return cells
  })

  return {
    colWidths: [12000, 15260, 15260],
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
