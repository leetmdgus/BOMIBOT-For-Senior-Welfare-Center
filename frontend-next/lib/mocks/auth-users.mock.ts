import { getRegionInfo, type RegionId } from "@/lib/auth/regions"
import type { AuthRole, AuthUser } from "@/services/auth.types"

export interface MockUserRecord extends AuthUser {
  password: string
}

const usersByRegion = new Map<RegionId, MockUserRecord[]>()

function seedAdminUsers(): void {
  const north = getRegionInfo("chuncheon-north")
  const east = getRegionInfo("chuncheon-east")

  usersByRegion.set("chuncheon-north", [
    {
      id: "admin-north",
      email: "admin@north.bomi.local",
      password: "bomi-north-2026",
      name: "이승현",
      role: "관리자",
      roleType: "admin",
      department: "운영총괄",
      regionId: "chuncheon-north",
      profileImage: "/이승현_증명사진.jpg",
    },
  ])

  usersByRegion.set("chuncheon-east", [
    {
      id: "admin-east",
      email: "admin@east.bomi.local",
      password: "bomi-east-2026",
      name: "김동부",
      role: "관리자",
      roleType: "admin",
      department: "운영총괄",
      regionId: "chuncheon-east",
    },
  ])

  void north
  void east
}

seedAdminUsers()

export function listUsersForRegion(regionId: RegionId): MockUserRecord[] {
  return usersByRegion.get(regionId) ?? []
}

export function findUserByCredentials(
  email: string,
  password: string,
  regionId: RegionId,
): MockUserRecord | null {
  const normalizedEmail = email.trim().toLowerCase()
  const users = listUsersForRegion(regionId)
  return (
    users.find(
      (user) =>
        user.email.toLowerCase() === normalizedEmail &&
        user.password === password,
    ) ?? null
  )
}

export function emailExistsInRegion(
  email: string,
  regionId: RegionId,
): boolean {
  const normalizedEmail = email.trim().toLowerCase()
  return listUsersForRegion(regionId).some(
    (user) => user.email.toLowerCase() === normalizedEmail,
  )
}

export function registerUser(input: {
  email: string
  password: string
  name: string
  department: string
  regionId: RegionId
}): MockUserRecord {
  if (emailExistsInRegion(input.email, input.regionId)) {
    throw new Error("이미 사용 중인 이메일입니다.")
  }

  const user: MockUserRecord = {
    id: `user-${input.regionId}-${Date.now()}`,
    email: input.email.trim().toLowerCase(),
    password: input.password,
    name: input.name.trim(),
    role: "사용자",
    roleType: "user",
    department: input.department.trim(),
    regionId: input.regionId,
  }

  const existing = listUsersForRegion(input.regionId)
  usersByRegion.set(input.regionId, [...existing, user])
  return user
}

export function toAuthUser(record: MockUserRecord): AuthUser {
  const { password: _password, ...user } = record
  return user
}
