import { versionHistoryMock } from "@/lib/mocks/kanban.version-history.mock"
import type {
  RestoreVersionHistoryResult,
  VersionHistoryEntry,
  VersionHistoryQuery,
} from "./kanban.version-history.types"

const restoredIds = new Set<string>()

function filterEntries(
  entries: VersionHistoryEntry[],
  query?: VersionHistoryQuery
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
        entry.projectName?.toLowerCase().includes(keyword)
    )
  }

  return result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export async function getVersionHistory(
  query?: VersionHistoryQuery
): Promise<VersionHistoryEntry[]> {
  const entries = versionHistoryMock.map((entry) => ({
    ...entry,
    canRestore: entry.canRestore && !restoredIds.has(entry.id),
  }))

  return filterEntries(entries, query)
}

export async function restoreVersionHistory(
  historyId: string
): Promise<RestoreVersionHistoryResult> {
  const entry = versionHistoryMock.find((item) => item.id === historyId)

  if (!entry) {
    return {
      success: false,
      historyId,
      message: "해당 버전 기록을 찾을 수 없습니다.",
    }
  }

  if (!entry.canRestore || restoredIds.has(historyId)) {
    return {
      success: false,
      historyId,
      message: "복원할 수 없는 기록입니다.",
    }
  }

  restoredIds.add(historyId)

  return {
    success: true,
    historyId,
    message: `"${entry.target}"을(를) 이 시점으로 복원했습니다.`,
  }
}
