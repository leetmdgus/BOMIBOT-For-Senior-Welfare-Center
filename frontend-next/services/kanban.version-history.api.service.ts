import type {
  RestoreVersionHistoryResult,
  VersionHistoryEntry,
  VersionHistoryQuery,
} from "./kanban.version-history.types"
import { apiClient, resolveApiPath } from "@/lib/api-client"

function buildQueryString(query?: VersionHistoryQuery) {
  const params = new URLSearchParams()
  if (query?.year) params.set("year", query.year)
  if (query?.actionType && query.actionType !== "all") {
    params.set("actionType", query.actionType)
  }
  if (query?.query?.trim()) params.set("query", query.query.trim())
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

const versionHistoryPath = (suffix = "") =>
  resolveApiPath(
    `/api/kanban/version-history${suffix}`,
    `/api/v1/kanban/version-history${suffix}`,
  )

export async function getVersionHistory(
  query?: VersionHistoryQuery,
): Promise<VersionHistoryEntry[]> {
  return apiClient.get<VersionHistoryEntry[]>(
    `${versionHistoryPath()}${buildQueryString(query)}`,
  )
}

export async function restoreVersionHistory(
  historyId: string,
): Promise<RestoreVersionHistoryResult> {
  return apiClient.post<RestoreVersionHistoryResult>(
    versionHistoryPath(`/${historyId}/restore`),
  )
}
