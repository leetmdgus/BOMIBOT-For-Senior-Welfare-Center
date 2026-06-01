import type {
  Employee,
  OrganizationContext,
  OrganizationPermissions,
} from "@/services/organization.types"

export function isSelfEmployee(
  context: OrganizationContext | null,
  employee: Employee,
): boolean {
  if (!context?.employeeId) return false
  return context.employeeId === employee.id
}

/** 본인 프로필만 수정 (연락처·사진 등) */
export function isSelfProfileEdit(
  context: OrganizationContext | null,
  employee: Employee,
): boolean {
  if (!context) return false
  if (!isSelfEmployee(context, employee)) return false
  return canEditEmployee(context, employee) && !canFullHrEdit(context, employee)
}

/** 부서·직책·입사일 등 HR 필드 수정 */
export function canFullHrEdit(
  context: OrganizationContext | null,
  employee: Employee,
): boolean {
  if (!context) return false
  const { permissions } = context
  if (!canEditEmployee(context, employee)) return false
  if (permissions.isAdmin) return true
  if (isSelfEmployee(context, employee)) return false
  if (permissions.isManagement) return true
  if (
    permissions.isTeamLeader &&
    employee.department === context.department
  ) {
    return true
  }
  return false
}

export function canEditEmployee(
  context: OrganizationContext | null,
  employee: Employee,
): boolean {
  if (!context) return false
  const { permissions, employeeId, department } = context

  if (permissions.isAdmin) return true
  if (employeeId && employee.id === employeeId) return true
  if (permissions.isManagement) return true
  if (permissions.isTeamLeader && employee.department === department) {
    return true
  }
  return false
}

export function canEditDepartment(permissions: OrganizationPermissions | null) {
  return Boolean(permissions?.canEditDepartment)
}

export function canAssignTeamLeader(permissions: OrganizationPermissions | null) {
  return Boolean(permissions?.canAssignTeamLeader)
}

export function canCreateEmployee(permissions: OrganizationPermissions | null) {
  return Boolean(permissions?.canCreateEmployee)
}
