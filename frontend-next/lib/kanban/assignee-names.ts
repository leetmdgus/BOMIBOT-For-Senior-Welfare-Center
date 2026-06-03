import type { KanbanProject } from "@/services/kanban.board.types"

const NAME_SPLIT = /[,/;|、]/
const TITLE_SUFFIX =
  /(사회복지사|생활지원사|요양보호사|관리자|팀장|주무|담당|과장|대리|사원|선생님)$/

export function normalizePersonToken(name: string): string {
  const token = name.trim().replace(/\s+/g, "")
  return token.replace(TITLE_SUFFIX, "")
}

export function parseAssigneeNames(field?: string | null): string[] {
  if (!field) return []
  const names: string[] = []
  const seen = new Set<string>()
  for (const part of String(field).split(NAME_SPLIT)) {
    const raw = part.trim()
    if (!raw) continue
    const normalized = normalizePersonToken(raw)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    names.push(raw)
  }
  return names
}

export function personMatchesAssigneeField(
  personName: string,
  field?: string | null,
): boolean {
  if (!personName || !field) return false
  const person = normalizePersonToken(personName)
  if (!person) return false
  for (const part of parseAssigneeNames(field)) {
    const segment = normalizePersonToken(part)
    if (segment && person === segment) return true
  }
  return false
}

export function collectProjectParticipantNames(project: KanbanProject): string[] {
  const merged: string[] = []
  const seen = new Set<string>()

  const appendField = (field?: string | null) => {
    for (const name of parseAssigneeNames(field)) {
      const key = normalizePersonToken(name)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(name)
    }
  }

  appendField(project.manager)
  for (const category of project.categories) {
    for (const task of category.tasks) {
      appendField(task.assignee)
    }
  }
  return merged
}

export function formatParticipantNames(names: string[]): string {
  return names.join(", ")
}

/** 카드·목록에 표시할 담당자 한 줄 요약 */
export function formatTaskAssigneeSummary(
  assignee?: string | null,
  team?: string | null,
): string {
  const names = parseAssigneeNames(assignee)
  const label =
    names.length > 0
      ? formatParticipantNames(names)
      : assignee?.trim()
        ? assignee.trim()
        : ""
  if (!label) return "담당자 미지정"
  const teamLabel = team?.trim()
  return teamLabel ? `${teamLabel} · ${label}` : label
}
