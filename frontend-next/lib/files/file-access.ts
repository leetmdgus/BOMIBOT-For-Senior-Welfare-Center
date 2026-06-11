import type { FileItem } from "@common/types/file-types"

function collectDescendantIds(files: FileItem[], folderId: string): Set<string> {
  const byParent = new Map<string | null, string[]>()
  for (const entry of files) {
    const parentKey = entry.parentId ?? null
    const list = byParent.get(parentKey) ?? []
    list.push(entry.id)
    byParent.set(parentKey, list)
  }

  const result = new Set<string>()
  const stack = [...(byParent.get(folderId) ?? [])]
  while (stack.length > 0) {
    const childId = stack.pop()
    if (!childId || result.has(childId)) continue
    result.add(childId)
    stack.push(...(byParent.get(childId) ?? []))
  }
  return result
}

export function fileEntryAllowed(
  entry: Pick<FileItem, "taskId" | "type">,
  allowedTaskIds: Set<string> | null,
): boolean {
  if (allowedTaskIds === null) return true
  if (!entry.taskId) return false
  return allowedTaskIds.has(entry.taskId)
}

/** 접근 가능한 파일 + 상위 폴더만 유지 (칸반 접근 규칙과 동일). */
export function filterFileTree(
  files: FileItem[],
  allowedTaskIds: Set<string> | null,
): FileItem[] {
  if (allowedTaskIds === null) return files

  const byId = new Map(files.map((entry) => [entry.id, entry]))
  const visible = new Set<string>()

  const addWithParents = (fileId: string) => {
    let current: string | null = fileId
    while (current && !visible.has(current)) {
      const item = byId.get(current)
      if (!item) break
      visible.add(current)
      current = item.parentId ?? null
    }
  }

  for (const entry of files) {
    if (!fileEntryAllowed(entry, allowedTaskIds)) continue
    addWithParents(entry.id)
    if (entry.type === "folder") {
      for (const childId of collectDescendantIds(files, entry.id)) {
        const child = byId.get(childId)
        if (child && fileEntryAllowed(child, allowedTaskIds)) {
          addWithParents(childId)
        }
      }
    }
  }

  return files.filter((entry) => visible.has(entry.id))
}
