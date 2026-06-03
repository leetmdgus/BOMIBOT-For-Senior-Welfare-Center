import type { AuthSession } from "@/services/auth.types"
import type { Employee } from "@/services/organization.types"

/** region 스코프 제거 후 비교 (emp-xxx) */
export function normalizeEmployeeId(id: string): string {
  const trimmed = id.trim()
  const colon = trimmed.indexOf(":")
  return colon >= 0 ? trimmed.slice(colon + 1) : trimmed
}

export function isCurrentSessionEmployee(
  session: AuthSession,
  employee: Pick<Employee, "id" | "email">,
  linkedEmployeeId?: string | null,
): boolean {
  const empId = normalizeEmployeeId(employee.id)
  const linked = linkedEmployeeId
    ? normalizeEmployeeId(linkedEmployeeId)
    : null

  if (linked && linked === empId) return true

  return (
    session.email.trim().toLowerCase() ===
    employee.email.trim().toLowerCase()
  )
}

export function sessionProfilePatchFromEmployee(
  employee: Pick<
    Employee,
    "name" | "role" | "department" | "profileImage" | "email"
  >,
): Partial<AuthSession> {
  return {
    name: employee.name,
    role: employee.role,
    department: employee.department,
    profileImage: employee.profileImage,
    email: employee.email,
  }
}
