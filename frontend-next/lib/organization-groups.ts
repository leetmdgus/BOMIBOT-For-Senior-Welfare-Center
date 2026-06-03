import type { Department, Employee } from "@/services/organization.types"

/** 직책별 그룹 패널 표시 순서 (스크린샷 기준) */
export const POSITION_CATALOG: readonly { id: string; name: string }[] = [
  { id: "position-director", name: "관장" },
  { id: "position-head", name: "부장" },
  { id: "position-team-lead", name: "팀장" },
  { id: "position-social-worker", name: "사회복지사" },
  { id: "position-physical-therapist", name: "물리치료사" },
  { id: "position-clerk", name: "사무원" },
  { id: "position-nutritionist", name: "영양사" },
  { id: "position-facility", name: "시설근무자" },
  { id: "position-driver", name: "운전사" },
  { id: "position-job-specialist", name: "취업전문가" },
] as const

/** POSITION_CATALOG 순서 기반 직책 위계 순위 (관장 → 부장 → 팀장 → 실무직 …) */
const POSITION_RANK = new Map(
  POSITION_CATALOG.map((position, index) => [position.name, index]),
)

/** 카탈로그에 없는 직책(예: 사원)은 가장 낮은 순위로 마지막에 배치 */
function positionRank(position: string): number {
  return POSITION_RANK.get(position.trim()) ?? POSITION_CATALOG.length
}

/**
 * 직책 위계로 직원을 정렬한다. 부장이 위, 팀장이 그 다음, 사원(실무직)이 마지막.
 * 같은 직책끼리는 기존 순서를 유지한다(안정 정렬).
 */
export function sortEmployeesByPositionRank(employees: Employee[]): Employee[] {
  return [...employees].sort(
    (a, b) => positionRank(a.position) - positionRank(b.position),
  )
}

/** 각 부서의 직원 목록을 직책 위계 순서로 정렬한 부서 배열을 반환 */
export function sortDepartmentsByPositionRank(
  departments: Department[],
): Department[] {
  return departments.map((department) => ({
    ...department,
    employees: sortEmployeesByPositionRank(department.employees),
  }))
}

export function getAllEmployeesFromDepartments(
  departments: Department[],
): Employee[] {
  return departments
    .filter((dept) => dept.id !== "all")
    .flatMap((dept) => dept.employees)
}

export function buildPositionGroups(employees: Employee[]): Department[] {
  const byPosition = new Map<string, Employee[]>()

  for (const employee of employees) {
    const key = employee.position.trim()
    const list = byPosition.get(key) ?? []
    list.push(employee)
    byPosition.set(key, list)
  }

  const groups: Department[] = [
    {
      id: "all",
      name: "전체 직원",
      count: employees.length,
      employees: [],
    },
  ]

  for (const { id, name } of POSITION_CATALOG) {
    const groupEmployees = [...(byPosition.get(name) ?? [])]
    if (id === "position-social-worker") {
      groupEmployees.sort((a, b) => {
        if (a.id === "emp-management-3") return -1
        if (b.id === "emp-management-3") return 1
        return a.name.localeCompare(b.name, "ko")
      })
    }
    groups.push({
      id,
      name,
      count: groupEmployees.length,
      employees: groupEmployees,
    })
  }

  return groups
}

export function filterGroupsBySelection(
  groups: Department[],
  selectedGroupId: string,
): Department[] {
  if (selectedGroupId === "all") {
    return groups.filter((group) => group.id !== "all")
  }

  const selected = groups.find((group) => group.id === selectedGroupId)
  if (!selected || selected.id === "all") {
    return groups.filter((group) => group.id !== "all")
  }

  return [selected]
}
