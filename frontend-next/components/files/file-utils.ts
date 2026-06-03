import type { FileItem, SortKey } from "./file-types"

/** 클릭과 구분 — 이만큼 이상 움직였을 때만 드롭 이동 처리 */
export const FILE_DRAG_MOVE_THRESHOLD_PX = 10

export function getBreadcrumbs(files: FileItem[], currentFolderId: string | null) {
  const result: FileItem[] = []
  let cursor = currentFolderId

  while (cursor) {
    const folder = files.find((item) => item.id === cursor && item.type === "folder")
    if (!folder) break

    result.unshift(folder)
    cursor = folder.parentId
  }

  return result
}

export function sortFiles(files: FileItem[], sortKey: SortKey) {
  return [...files].sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1
    if (a.type !== "folder" && b.type === "folder") return 1

    if (sortKey === "name") {
      return a.name.localeCompare(b.name, "ko")
    }

    if (sortKey === "created") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }

    return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  })
}

export function collectDescendantIds(files: FileItem[], folderId: string) {
  const result = new Set<string>()

  const visit = (parentId: string) => {
    files
      .filter((item) => item.parentId === parentId)
      .forEach((item) => {
        result.add(item.id)
        if (item.type === "folder") visit(item.id)
      })
  }

  visit(folderId)
  return result
}

export function canMoveItem(files: FileItem[], itemId: string, targetFolderId: string | null) {
  if (itemId === targetFolderId) return false

  const item = files.find((file) => file.id === itemId)
  if (!item) return false

  if (item.type === "folder" && targetFolderId) {
    const descendants = collectDescendantIds(files, item.id)
    if (descendants.has(targetFolderId)) return false
  }

  return item.parentId !== targetFolderId
}

export function buildExportPayload(files: FileItem[], targetIds: string[]) {
  const includedIds = new Set<string>()

  targetIds.forEach((id) => {
    includedIds.add(id)
    const item = files.find((file) => file.id === id)
    if (item?.type === "folder") {
      collectDescendantIds(files, item.id).forEach((childId) => includedIds.add(childId))
    }
  })

  const exported = files.filter((file) => includedIds.has(file.id))

  return {
    exportedAt: new Date().toISOString(),
    items: exported,
  }
}

export function exportItemsAsJson(files: FileItem[], targetIds: string[], fileName = "files-export.json") {
  const payload = buildExportPayload(files, targetIds)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function getTypeByFileName(name: string): FileItem["type"] {
  const extension = name.split(".").pop()?.toLowerCase()

  if (!extension) return "etc"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image"
  if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet"
  if (["mp4", "mov", "avi", "webm"].includes(extension)) return "video"
  if (["pdf"].includes(extension)) return "pdf"
  if (["zip", "7z", "rar"].includes(extension)) return "archive"
  if (["doc", "docx", "hwp", "txt", "ppt", "pptx"].includes(extension)) return "document"

  return "etc"
}
