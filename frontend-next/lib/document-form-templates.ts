import {
  createDefaultCustomTable,
  serializeTableSectionContent,
  type BusinessPlanTablePreset,
} from "@/lib/business-plan-table-utils"
import {
  formalEvaluationTableHtml,
  formalPurposeGoalsTableHtml,
  formalStaffCountTableHtml,
} from "@/lib/formal-document-html"
import { buildRichTextListHtml } from "@/lib/rich-text-list-utils"
import { buildTableHtml } from "@/lib/rich-text-table-utils"

export type RichTextFormTemplate = {
  id: string
  label: string
  description?: string
  html: string
}

/** 본문 리치텍스트에 삽입하는 HWPX형 HTML 양식 */
export const RICH_TEXT_FORM_TEMPLATES: RichTextFormTemplate[] = [
  {
    id: "table-3x3",
    label: "표 3×3",
    description: "기본 빈 표",
    html: buildTableHtml(3, 3),
  },
  {
    id: "table-2x4",
    label: "표 2×4",
    html: buildTableHtml(2, 4),
  },
  {
    id: "table-label-value",
    label: "항목·내용 2열표",
    description: "라벨(회색) / 내용 행",
    html: labelValueTableHtml(4),
  },
  {
    id: "table-schedule",
    label: "일정표 (4열)",
    html: scheduleTableHtml(),
  },
  {
    id: "list-hangul",
    label: "가. 목록",
    html: buildRichTextListHtml("hangul", ["첫 번째 항목", "두 번째 항목"]),
  },
  {
    id: "section-heading",
    label: "소제목 + 본문",
    html:
      '<p><strong>1. 소제목</strong></p><p>내용을 입력하세요.</p><p><br></p>',
  },
  {
    id: "formal-eval-table",
    label: "전년도 평가 표",
    description: "영역·평가·반영사항",
    html: formalEvaluationTableHtml(),
  },
  {
    id: "formal-staff-table",
    label: "실인원수 표",
    description: "①②③④ · 각주",
    html: formalStaffCountTableHtml(),
  },
  {
    id: "formal-goals-table",
    label: "목적·목표 표",
    description: "병합·산출/성과",
    html: formalPurposeGoalsTableHtml(),
  },
]

export type TableBlockTemplate = {
  id: string
  label: string
  preset: BusinessPlanTablePreset
  title: string
  content: string
}

/** 문서 블록으로 추가하는 표 양식 (사업계획·평가 공통) */
export const TABLE_BLOCK_TEMPLATES: TableBlockTemplate[] = [
  {
    id: "purpose-goals",
    label: "목적·목표 표",
    preset: "purpose-goals",
    title: "1. 사업의 목적 및 목표",
    content: serializeTableSectionContent({ preset: "purpose-goals" }),
  },
  {
    id: "custom-3x3",
    label: "자유 표 3×3",
    preset: "custom",
    title: "표",
    content: serializeTableSectionContent(createDefaultCustomTable(3, 3, 1)),
  },
  {
    id: "custom-4x2",
    label: "자유 표 4×2",
    preset: "custom",
    title: "표",
    content: serializeTableSectionContent(createDefaultCustomTable(4, 2, 1)),
  },
  {
    id: "custom-5x3",
    label: "자유 표 5×3",
    preset: "custom",
    title: "표",
    content: serializeTableSectionContent(createDefaultCustomTable(5, 3, 1)),
  },
]

function hwpxCell(isLabel: boolean, text: string): string {
  const cls = isLabel
    ? "border border-black bg-[#f2f2f2] p-2 text-center font-semibold"
    : "border border-black p-2 align-top"
  const tag = isLabel ? "th" : "td"
  return `<${tag} class="${cls}">${text}</${tag}>`
}

function labelValueTableHtml(rowCount: number): string {
  const rows = Array.from({ length: rowCount }, (_, i) => {
    const label = i === 0 ? "항목" : `항목 ${i + 1}`
    return `<tr>${hwpxCell(true, label)}${hwpxCell(false, "&nbsp;")}</tr>`
  }).join("")
  return `<table class="bp-rt-table hwpx-rt-table w-full border-collapse border border-black text-sm my-2"><tbody>${rows}</tbody></table><p><br></p>`
}

function scheduleTableHtml(): string {
  const header = `<tr>
    ${hwpxCell(true, "일자")}
    ${hwpxCell(true, "시간")}
    ${hwpxCell(true, "내용")}
    ${hwpxCell(true, "비고")}
  </tr>`
  const body = Array.from({ length: 3 }, () =>
    `<tr>
      ${hwpxCell(false, "&nbsp;")}
      ${hwpxCell(false, "&nbsp;")}
      ${hwpxCell(false, "&nbsp;")}
      ${hwpxCell(false, "&nbsp;")}
    </tr>`,
  ).join("")
  return `<table class="bp-rt-table hwpx-rt-table w-full border-collapse border border-black text-sm my-2"><tbody>${header}${body}</tbody></table><p><br></p>`
}
