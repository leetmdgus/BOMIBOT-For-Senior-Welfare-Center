import type {
  BusinessPlanSection,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

export type DocumentSection = BusinessPlanSection | EvaluationSection

export type DocumentSectionRowKind = "heading" | "toc" | "body"

/** HWPX 표1 한 행 — section 타입에 따라 대목차/목차/본문 행이 가변 생성 */
export type DocumentSectionRow = {
  kind: DocumentSectionRowKind
  label: "대목차" | "목차" | "본문"
  headingSectionId?: string
  bodySectionId?: string
  value: string
  /** 본문 행 — HTML */
  htmlValue?: string
}

export function rowsFromDocumentSections(
  sections: DocumentSection[],
): DocumentSectionRow[] {
  const rows: DocumentSectionRow[] = []

  for (const section of sections) {
    if (section.type === "heading") {
      rows.push({
        kind: "heading",
        label: "대목차",
        headingSectionId: String(section.id),
        value: section.title?.trim() || "",
      })
      continue
    }
    if (section.type !== "body") {
      continue
    }

    rows.push({
      kind: "toc",
      label: "목차",
      bodySectionId: String(section.id),
      value: section.title?.trim() || "",
    })
    rows.push({
      kind: "body",
      label: "본문",
      bodySectionId: String(section.id),
      value: section.content ?? "",
      htmlValue: section.content ?? "",
    })
  }

  return rows
}

export function blocksFromDocumentSections(sections: DocumentSection[]) {
  /** @deprecated rowsFromDocumentSections 사용 */
  const rows = rowsFromDocumentSections(sections)
  const blocks: Array<{
    headingSectionId?: string
    bodySectionId?: string
    headingTitle: string
    tocTitle: string
    bodyContent: string
  }> = []

  let pendingHeading: DocumentSectionRow | null = null
  for (const row of rows) {
    if (row.kind === "heading") {
      pendingHeading = row
      continue
    }
    if (row.kind === "toc") {
      blocks.push({
        headingSectionId: pendingHeading?.headingSectionId,
        bodySectionId: row.bodySectionId,
        headingTitle: pendingHeading?.value || "-",
        tocTitle: row.value || "-",
        bodyContent: "",
      })
      pendingHeading = null
      continue
    }
    if (row.kind === "body" && blocks.length > 0) {
      blocks[blocks.length - 1].bodyContent = row.htmlValue ?? row.value
    }
  }
  if (pendingHeading) {
    blocks.push({
      headingSectionId: pendingHeading.headingSectionId,
      headingTitle: pendingHeading.value || "-",
      tocTitle: "-",
      bodyContent: "",
    })
  }
  return blocks
}

export function countSectionBlocks(sections: DocumentSection[]): number {
  return blocksFromDocumentSections(sections).length
}

export function blockSectionIds(
  sections: DocumentSection[],
  blockIndex: number,
): string[] {
  const block = blocksFromDocumentSections(sections)[blockIndex]
  if (!block) return []
  const ids: string[] = []
  if (block.headingSectionId) ids.push(block.headingSectionId)
  if (block.bodySectionId) ids.push(block.bodySectionId)
  return ids
}

export function deleteBlockFromSections<T extends DocumentSection>(
  sections: T[],
  blockIndex: number,
): T[] {
  const drop = new Set(blockSectionIds(sections, blockIndex))
  return sections.filter((section) => !drop.has(String(section.id)))
}

export function moveBlockInSections<T extends DocumentSection>(
  sections: T[],
  blockIndex: number,
  direction: "up" | "down",
): T[] {
  const blocks = blocksFromDocumentSections(sections)
  const target = direction === "up" ? blockIndex - 1 : blockIndex + 1
  if (target < 0 || target >= blocks.length) return sections
  const swapped = [...blocks]
  ;[swapped[blockIndex], swapped[target]] = [swapped[target], swapped[blockIndex]]

  const byId = new Map(sections.map((section) => [String(section.id), section]))
  const used = new Set<string>()
  const ordered: T[] = []

  for (const section of sections) {
    if (section.type === "file") {
      ordered.push(section)
      used.add(String(section.id))
    }
  }

  for (const block of swapped) {
    if (block.headingSectionId && byId.has(block.headingSectionId)) {
      ordered.push(byId.get(block.headingSectionId)!)
      used.add(block.headingSectionId)
    }
    if (block.bodySectionId && byId.has(block.bodySectionId)) {
      ordered.push(byId.get(block.bodySectionId)!)
      used.add(block.bodySectionId)
    }
  }

  for (const section of sections) {
    if (!used.has(String(section.id))) ordered.push(section)
  }

  return ordered
}

export function isDocumentSectionType(section: DocumentSection): boolean {
  return section.type === "heading" || section.type === "body"
}

/** 표1 대목차·목차·본문만 바꿀 때 table/file 등 다른 섹션 순서를 유지 */
export function mergeDocumentSectionsInOrder<T extends DocumentSection>(
  allSections: T[],
  nextDocSections: T[],
): T[] {
  const result: T[] = []
  let docIdx = 0

  for (const section of allSections) {
    if (isDocumentSectionType(section)) {
      if (docIdx < nextDocSections.length) {
        result.push(nextDocSections[docIdx++])
      }
    } else {
      result.push(section)
    }
  }

  while (docIdx < nextDocSections.length) {
    result.push(nextDocSections[docIdx++])
  }

  return result
}

export function findSectionIndex(
  sections: DocumentSection[],
  sectionId: string | number,
): number {
  const id = String(sectionId)
  return sections.findIndex((section) => String(section.id) === id)
}

export function deleteRowFromSections<T extends DocumentSection>(
  sections: T[],
  row: DocumentSectionRow,
): T[] {
  if (row.kind === "heading" && row.headingSectionId) {
    return sections.filter(
      (section) => String(section.id) !== row.headingSectionId,
    )
  }
  if (row.bodySectionId) {
    return sections.filter(
      (section) => String(section.id) !== row.bodySectionId,
    )
  }
  return sections
}

export function rowGroupIndex(
  rows: DocumentSectionRow[],
  rowIndex: number,
): number {
  let group = 0
  for (let i = 0; i < rowIndex; i += 1) {
    if (rows[i]?.kind === "heading") {
      group += 1
    } else if (rows[i]?.kind === "toc") {
      group += 1
    }
  }
  return group
}

export function moveRowGroupInSections<T extends DocumentSection>(
  sections: T[],
  rowIndex: number,
  direction: "up" | "down",
): T[] {
  const rows = rowsFromDocumentSections(sections)
  const groupStarts: number[] = []
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i]?.kind === "heading" || rows[i]?.kind === "toc") {
      groupStarts.push(i)
    }
  }
  const currentGroup = groupStarts.findIndex((start) => {
    const next = groupStarts[groupStarts.indexOf(start) + 1] ?? rows.length
    return rowIndex >= start && rowIndex < next
  })
  if (currentGroup < 0) return sections
  return moveBlockInSections(sections, currentGroup, direction)
}
