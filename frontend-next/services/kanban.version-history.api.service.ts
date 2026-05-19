import type {
  RestoreVersionHistoryResult,
  VersionHistoryEntry,
  VersionHistoryQuery,
} from "./kanban.version-history.types"

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

export async function getVersionHistory(
  query?: VersionHistoryQuery
): Promise<VersionHistoryEntry[]> {
  const response = await fetch(
    `/api/kanban/version-history${buildQueryString(query)}`
  )

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export async function restoreVersionHistory(
  historyId: string
): Promise<RestoreVersionHistoryResult> {
  const response = await fetch(
    `/api/kanban/version-history/${historyId}/restore`,
    { method: "POST" }
  )

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}
