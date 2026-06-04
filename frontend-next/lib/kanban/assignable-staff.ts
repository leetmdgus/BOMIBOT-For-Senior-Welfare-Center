import { getClientSession } from "@/lib/auth/session"
import { cachedApiGet } from "@/lib/api-get-cache"
import { DEFAULT_KANBAN_STAFF } from "@/lib/kanban/static-config"
import { getStaffList } from "@/services/kanban.board.service"
import type { Staff } from "@/services/kanban.board.types"
import { getOrganizationContext } from "@/services/organization.service"
import { searchEmployees } from "@/services/organization.service"
import type { Employee } from "@/services/organization.types"

export function employeeToStaff(employee: Employee): Staff {
  return {
    id: employee.id,
    name: employee.name,
    team: employee.department || "",
    position: employee.position || employee.role || "",
  }
}

export function flattenOrganizationEmployees(
  result: Awaited<ReturnType<typeof searchEmployees>>,
): Staff[] {
  const seen = new Set<string>()
  const list: Staff[] = []

  const append = (employee: Employee) => {
    if (!employee.name?.trim() || seen.has(employee.id)) return
    seen.add(employee.id)
    list.push(employeeToStaff(employee))
  }

  for (const department of result.departments) {
    for (const employee of department.employees) {
      append(employee)
    }
  }

  for (const employee of result.employees) {
    append(employee)
  }

  return list.sort((a, b) =>
    `${a.team}${a.name}`.localeCompare(`${b.team}${b.name}`, "ko"),
  )
}

export async function loadAssignableStaff(): Promise<Staff[]> {
  try {
    // 칸반 마운트마다 무캐시로 조직도 전체를 재페치하던 경로 — 짧은 TTL 캐시로 재방문·연도전환 시 즉시.
    // 무인자 풀트리만 캐시(검색어 호출은 organization-page에서 직접 → 키 충돌 방지). 직원 mutation 시 무효화됨.
    const result = await cachedApiGet(
      "org:employees:all",
      () => searchEmployees(),
      { ttlMs: 120_000 },
    )
    const fromOrganization = flattenOrganizationEmployees(result)
    if (fromOrganization.length > 0) return fromOrganization
  } catch (error) {
    console.warn("조직 직원 목록 로드 실패, 칸반 staff API로 대체:", error)
  }

  try {
    const staff = await getStaffList()
    return staff.length > 0 ? staff : DEFAULT_KANBAN_STAFF
  } catch {
    return DEFAULT_KANBAN_STAFF
  }
}

export async function resolveCurrentUserStaff(
  staffList: Staff[],
): Promise<Staff | null> {
  const session = getClientSession()
  if (!session) return null

  let employeeId: string | null = null
  try {
    const context = await getOrganizationContext()
    employeeId = context.employeeId
  } catch {
    // context 없으면 이름으로 매칭
  }

  if (employeeId) {
    const matched = staffList.find((staff) => staff.id === employeeId)
    if (matched) return matched
  }

  const byName = staffList.find((staff) => staff.name === session.name)
  if (byName) return byName

  return {
    id: employeeId ?? session.id,
    name: session.name,
    team: session.department || "",
    position: session.role || "",
  }
}

export function ensureAssigneesIncludeSelf(
  assignees: Staff[],
  currentUser: Staff,
): Staff[] {
  if (assignees.some((item) => item.id === currentUser.id)) {
    return assignees
  }
  return [currentUser, ...assignees]
}

export function formatAssigneeLabel(staff: Staff): string {
  return [staff.team, staff.name, staff.position].filter(Boolean).join(" ")
}

export function formatTaskAssigneeField(assignees: Staff[]): string {
  if (assignees.length === 0) return ""
  return assignees.map((item) => item.name).join(", ")
}
