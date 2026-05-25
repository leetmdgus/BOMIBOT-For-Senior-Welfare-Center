import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import type {
  RestoreVersionHistoryResult,
  VersionHistoryEntry,
  VersionHistoryQuery,
} from "./kanban.version-history.types"

const restoredIdsByRegion = new Map<RegionId, Set<string>>()

function filterEntries(
  entries: VersionHistoryEntry[],
  query?: VersionHistoryQuery,
): VersionHistoryEntry[] {
  let result = [...entries]

  if (query?.actionType && query.actionType !== "all") {
    result = result.filter((entry) => entry.actionType === query.actionType)
  }

  const keyword = query?.query?.trim().toLowerCase()

  if (keyword) {
    result = result.filter(
      (entry) =>
        entry.user.toLowerCase().includes(keyword) ||
        entry.target.toLowerCase().includes(keyword) ||
        entry.action.toLowerCase().includes(keyword) ||
        entry.projectName?.toLowerCase().includes(keyword),
    )
  }

  return result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

async function getRestoredIds(regionId?: RegionId): Promise<Set<string>> {
  const store = await loadRegionStore({ regionId })

  const existing = restoredIdsByRegion.get(store.regionId)
  if (existing) return existing

  const created = new Set<string>()
  restoredIdsByRegion.set(store.regionId, created)
  return created
}

export async function getVersionHistory(
  query?: VersionHistoryQuery,
  regionId?: RegionId,
): Promise<VersionHistoryEntry[]> {
  const store = await loadRegionStore({ regionId })
  const restoredIds = await getRestoredIds(store.regionId)

  const entries = store.versionHistory.entries.map((entry) => ({
    ...entry,
    canRestore: entry.canRestore && !restoredIds.has(entry.id),
  }))

  return filterEntries(entries, query)
}

export async function restoreVersionHistory(
  historyId: string,
  regionId?: RegionId,
): Promise<RestoreVersionHistoryResult> {
  const store = await loadRegionStore({ regionId })
  const restoredIds = await getRestoredIds(store.regionId)
  const entry = store.versionHistory.entries.find((item) => item.id === historyId)

  if (!entry) {
    return {
      success: false,
      historyId,
      message: "?? ?? ??? ?? ? ????.",
    }
  }

  if (!entry.canRestore || restoredIds.has(historyId)) {
    return {
      success: false,
      historyId,
      message: "??? ? ?? ?????.",
    }
  }

  restoredIds.add(historyId)

  return {
    success: true,
    historyId,
    message: `"${entry.target}"?(?) ? ???? ??????.`,
  }
}
