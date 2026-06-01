import { getClientSession } from "@/lib/auth/session"
import { getRegionIdFromRequest } from "@/lib/auth/server-session"
import type { RegionId } from "@/lib/auth/regions"
import type { RegionStore } from "@/lib/mocks/region-store"

export async function loadRegionStore(options?: {
  regionId?: RegionId
  request?: Request
}): Promise<RegionStore> {
  const regionId =
    options?.regionId ??
    getClientSession()?.regionId ??
    (options?.request ? getRegionIdFromRequest(options.request) : null)

  if (!regionId) {
    throw new Error("로그인이 필요합니다.")
  }

  const { getRegionStore } = await import("@/lib/mocks/region-store")
  return getRegionStore(regionId)
}

export function requireRegionId(request: Request): RegionId {
  const regionId = getRegionIdFromRequest(request)
  if (!regionId) {
    throw new Error("Unauthorized")
  }
  return regionId
}
