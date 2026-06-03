import type {
  BusinessPlanSection,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

type ExportSection = BusinessPlanSection | EvaluationSection

/** HWPX·인쇄 영역과 동일 — 추가 본문(대목차·목차·본문)만 */
export function documentSectionsForHwpxExport<T extends ExportSection>(
  sections: T[],
): T[] {
  return sections.filter(
    (section) => section.type === "heading" || section.type === "body",
  )
}

type SectionWithDomFields = {
  id: string | number
  type: string
  title?: string
  content?: string
}

/** flush 직후 DOM에서 추가 본문(대목차·목차·본문) 최신 값 반영 */
export function mergeFlushedDocumentSections<T extends SectionWithDomFields>(
  sections: T[],
): T[] {
  if (typeof document === "undefined" || sections.length === 0) {
    return sections
  }

  const byId = new Map(sections.map((section) => [String(section.id), { ...section }]))

  for (const el of document.querySelectorAll<HTMLElement>("[data-bp-section-id]")) {
    const id = el.dataset.bpSectionId
    if (!id || !byId.has(id)) continue

    const field = el.dataset.bpSectionField ?? "content"
    const section = byId.get(id)!
    const textValue =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el.value
        : (el.textContent ?? "")

    if (field === "title") {
      byId.set(id, { ...section, title: textValue })
      continue
    }

    if (field === "content" && section.type === "body") {
      const content = el.classList.contains("bp-rich-editor")
        ? el.innerHTML
        : textValue
      byId.set(id, { ...section, content })
    }
  }

  return sections.map((section) => byId.get(String(section.id)) ?? section)
}
