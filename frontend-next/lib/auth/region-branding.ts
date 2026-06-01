import { getClientSession } from "@/lib/auth/session"
import { getRegionInfo, type RegionId } from "@/lib/auth/regions"

export function resolveRegionOrgName(regionId?: RegionId): string {
  const session = getClientSession()
  const id = regionId ?? session?.regionId
  if (!id) return "노인복지관"
  return getRegionInfo(id).orgName
}

export function resolveRegionLabel(regionId?: RegionId): string {
  const session = getClientSession()
  const id = regionId ?? session?.regionId
  if (!id) return ""
  return getRegionInfo(id).label
}
