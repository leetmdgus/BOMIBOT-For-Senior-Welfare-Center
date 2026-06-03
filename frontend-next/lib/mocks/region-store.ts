import { getRegionInfo, type RegionId } from "@/lib/auth/regions"

import type { RegionStore } from "@/lib/mocks/region-store.types"



import northBundle from "@/lib/mocks/seed-data/chuncheon-north/bundle.json"

import eastBundle from "@/lib/mocks/seed-data/chuncheon-east/bundle.json"



export type { RegionStore } from "@/lib/mocks/region-store.types"



const BUNDLES: Record<RegionId, RegionStore> = {

  "chuncheon-north": northBundle as RegionStore,

  "chuncheon-east": eastBundle as RegionStore,

}



const storeCache = new Map<RegionId, RegionStore>()



export function getRegionStore(regionId: RegionId): RegionStore {

  const cached = storeCache.get(regionId)

  if (cached) return cached



  const bundle = BUNDLES[regionId]

  if (!bundle) {

    throw new Error(`Unknown region: ${regionId}`)

  }



  const { orgName } = getRegionInfo(regionId)

  const store: RegionStore = {

    ...bundle,

    regionId,

    orgName,

  }

  storeCache.set(regionId, store)

  return store

}

