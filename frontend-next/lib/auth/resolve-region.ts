import { getClientSession } from "@/lib/auth/session"
import { getSessionFromRequest } from "@/lib/auth/server-session"
import type { RegionId } from "@/lib/auth/regions"

export { loadRegionStore, requireRegionId } from "@/lib/auth/load-region-store"

export async function resolveRegionStore() {
  const { loadRegionStore } = await import("@/lib/auth/load-region-store")
  return loadRegionStore()
}

export async function resolveRegionStoreFromRequest(request: Request) {
  const { loadRegionStore } = await import("@/lib/auth/load-region-store")
  return loadRegionStore({ request })
}

export function resolveRegionIdFromClient(): RegionId | null {
  return getClientSession()?.regionId ?? null
}
