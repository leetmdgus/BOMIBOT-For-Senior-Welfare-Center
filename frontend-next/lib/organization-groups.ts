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
