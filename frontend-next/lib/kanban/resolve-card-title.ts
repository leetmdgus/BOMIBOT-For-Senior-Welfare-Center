import { findTaskLocation } from "@/lib/mocks/kanban.board.mock"
import type { KanbanProject } from "@/services/kanban.board.types"

export function normalizeTaskId(taskId: string): string {
  const index = taskId.indexOf(":")
  return (index >= 0 ? taskId.slice(index + 1) : taskId).trim()
}

/** 사업명 = 칸반 카드명(업무명) */
export function resolveKanbanCardTitle(
  taskId: string,
  projects: KanbanProject[],
): string | null {
  const location = findTaskLocation(normalizeTaskId(taskId), projects)
  const title = location?.task.title?.trim()
  return title || null
}

export function businessNameForTask(
  taskId: string,
  cardTitle?: string | null,
): string {
  const name = cardTitle?.trim()
  if (name) return name
  return normalizeTaskId(taskId)
}
