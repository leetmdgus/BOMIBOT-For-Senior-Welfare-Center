export const REGION_IDS = ["chuncheon-north", "chuncheon-east"] as const

export type RegionId = (typeof REGION_IDS)[number]

export interface RegionInfo {
  id: RegionId
  label: string
  shortLabel: string
  orgName: string
}

export const REGIONS: Record<RegionId, RegionInfo> = {
  "chuncheon-north": {
    id: "chuncheon-north",
    label: "춘천 북부",
    shortLabel: "북부",
    orgName: "춘천북부노인복지관",
  },
  "chuncheon-east": {
    id: "chuncheon-east",
    label: "춘천 동부",
    shortLabel: "동부",
    orgName: "춘천동부노인복지관",
  },
}

export function isRegionId(value: string): value is RegionId {
  return REGION_IDS.includes(value as RegionId)
}

export function getRegionInfo(regionId: RegionId): RegionInfo {
  return REGIONS[regionId]
}
