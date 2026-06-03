import { personMatchesAssigneeField } from "@/lib/kanban/assignee-names"
import { getClientSession } from "@/lib/auth/session"
import type { RegionId } from "@/lib/auth/regions"
import { getOrganizationContext } from "@/services/organization.service"
import type { KanbanProject, Task } from "@/services/kanban.board.types"

export interface KanbanProjectAccessScope {
  bypass: boolean
  userName: string
  department: string
  isTeamLeader: boolean
}

function normalizeTeamLabel(value: string): string {
  return value.trim().replace(/\s+/g, "")
}

export function teamScopeMatches(
  department: string,
  projectTeam?: string | null,
): boolean {
  if (!department || !projectTeam) return false
  const left = normalizeTeamLabel(department)
  const right = normalizeTeamLabel(String(projectTeam))
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

/** 사업 전체 카드 조회 — 관리자·팀장(소속 팀 사업)만. */
export function hasFullProjectAccess(
  project: KanbanProject,
  scope: KanbanProjectAccessScope,
): boolean {
  if (scope.bypass) return true
  if (scope.isTeamLeader && teamScopeMatches(scope.department, project.team)) {
    return true
  }
  return false
}

/** 사업 설정·업무 추가 — 관리자·팀장·사업 담당자(manager). */
export function canManageProject(
  project: KanbanProject,
  scope: KanbanProjectAccessScope,
): boolean {
  if (hasFullProjectAccess(project, scope)) return true
  if (!scope.userName) return false
  return personMatchesAssigneeField(scope.userName, project.manager)
}

export function canAccessTask(
  project: KanbanProject,
  task: Task,
  scope: KanbanProjectAccessScope,
): boolean {
  if (hasFullProjectAccess(project, scope)) return true
  if (!scope.userName) return false
  return personMatchesAssigneeField(scope.userName, task.assignee)
}

export function canAccessProject(
  project: KanbanProject,
  scope: KanbanProjectAccessScope,
): boolean {
  if (hasFullProjectAccess(project, scope)) return true
  return project.categories.some((category) =>
    category.tasks.some((task) => canAccessTask(project, task, scope)),
  )
}

function filterProjectTasks(
  project: KanbanProject,
  scope: KanbanProjectAccessScope,
): KanbanProject | null {
  if (hasFullProjectAccess(project, scope)) return project

  const categories = project.categories
    .map((category) => ({
      ...category,
      tasks: category.tasks.filter((task) =>
        canAccessTask(project, task, scope),
      ),
    }))
    .filter((category) => category.tasks.length > 0)

  if (categories.length === 0) return null
  return { ...project, categories }
}

export function collectAccessibleTaskIds(projects: KanbanProject[]): Set<string> {
  const ids = new Set<string>()
  for (const project of projects) {
    for (const category of project.categories) {
      for (const task of category.tasks) {
        if (task.id) ids.add(task.id)
      }
    }
  }
  return ids
}

export async function resolveKanbanProjectAccessScope(): Promise<KanbanProjectAccessScope> {
  const session = getClientSession()
  if (!session) {
    return { bypass: true, userName: "", department: "", isTeamLeader: false }
  }

  if (session.roleType === "admin") {
    return {
      bypass: true,
      userName: session.name,
      department: session.department,
      isTeamLeader: false,
    }
  }

  try {
    const context = await getOrganizationContext()
    return {
      bypass: context.permissions.isAdmin,
      userName: session.name?.trim() ?? "",
      department: (context.department || session.department || "").trim(),
      isTeamLeader: context.permissions.isTeamLeader,
    }
  } catch {
    return {
      bypass: false,
      userName: session.name?.trim() ?? "",
      department: session.department?.trim() ?? "",
      isTeamLeader: false,
    }
  }
}

/** 관리자만 파일·문서 필터를 완전히 건너뜀 (팀장은 팀 사업 taskId 기준). */
export async function shouldBypassProjectAccess(): Promise<boolean> {
  const scope = await resolveKanbanProjectAccessScope()
  return scope.bypass
}

export async function filterProjectsByAssignee(
  projects: KanbanProject[],
  _regionId?: RegionId,
): Promise<KanbanProject[]> {
  const scope = await resolveKanbanProjectAccessScope()
  if (scope.bypass) return projects
  if (!scope.userName && !scope.isTeamLeader) return []

  const result: KanbanProject[] = []
  for (const project of projects) {
    const filtered = filterProjectTasks(project, scope)
    if (filtered) result.push(filtered)
  }
  return result
}
