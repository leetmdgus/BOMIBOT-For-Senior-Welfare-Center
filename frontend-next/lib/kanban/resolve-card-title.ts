import { findTaskLocation } from "@/lib/mocks/kanban.board.mock"
import {
  formatParticipantNames,
  formatTaskAssigneeSummary,
  parseAssigneeNames,
} from "@/lib/kanban/assignee-names"
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

/**
 * 칸반 카드(업무) → 담당 표시 라벨("팀 · 담당자").
 * 사업계획 '담당' 필드 연결용. 담당자 미지정이면 빈 문자열을 반환한다.
 */
export function resolveTaskManagerLabel(
  taskId: string,
  projects: KanbanProject[],
): string {
  const location = findTaskLocation(normalizeTaskId(taskId), projects)
  if (!location) return ""
  if (parseAssigneeNames(location.task.assignee).length === 0) return ""

  const project = projects.find((item) => item.id === location.projectId)
  return formatTaskAssigneeSummary(location.task.assignee, project?.team)
}

/**
 * 칸반 카드(업무) → 사업팀·담당자(분리).
 * 사업평가서의 「사업팀」·「담당자」칸 자동 채움용. 미지정이면 빈 문자열.
 */
export function resolveTaskTeamAndManager(
  taskId: string,
  projects: KanbanProject[],
): { team: string; manager: string } {
  const location = findTaskLocation(normalizeTaskId(taskId), projects)
  if (!location) return { team: "", manager: "" }

  const project = projects.find((item) => item.id === location.projectId)
  const names = parseAssigneeNames(location.task.assignee)
  return {
    team: project?.team?.trim() ?? "",
    manager: names.length > 0 ? formatParticipantNames(names) : "",
  }
}
