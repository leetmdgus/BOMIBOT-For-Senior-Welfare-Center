import JSZip from "jszip"

import type { FileItem } from "@/components/files/file-types"
import { buildExportPayload } from "@/components/files/file-utils"

export async function buildFolderZipBlob(
  files: FileItem[],
  rootIds: string[],
  resolveBlob: (fileId: string) => Promise<Blob | null>,
): Promise<{ blob: Blob; filename: string }> {
  const payload = buildExportPayload(files, rootIds)
  const includedIds = new Set(payload.items.map((item) => item.id))
  const byId = new Map(files.map((file) => [file.id, file]))
  const rootIdSet = new Set(rootIds)

  const zip = new JSZip()
  zip.file(
    "_manifest.json",
    JSON.stringify(payload, null, 2),
  )

  const zipPath = (item: FileItem): string => {
    const chain: FileItem[] = []
    let current: FileItem | undefined = item
    while (current) {
      chain.unshift(current)
      if (rootIdSet.has(current.id)) break
      const parentId = current.parentId
      current = parentId ? byId.get(parentId) : undefined
    }
    return chain.map((part) => part.name).join("/")
  }

  let archiveName = "files-export"
  if (rootIds.length === 1) {
    archiveName = byId.get(rootIds[0])?.name ?? archiveName
  }

  for (const item of payload.items) {
    if (!includedIds.has(item.id)) continue
    const path = zipPath(item)

    if (item.type === "folder") {
      zip.folder(path)
      continue
    }

    const blob = await resolveBlob(item.id)
    if (blob) {
      zip.file(path, blob)
    } else {
      zip.file(
        `${path}.readme.txt`,
        "이 항목은 메타데이터만 있고 업로드된 실제 파일이 없습니다.",
      )
    }
  }

  const blob = await zip.generateAsync({ type: "blob" })
  const safeName = archiveName.replace(/[\\/:*?"<>|]/g, "_")
  return { blob, filename: `${safeName}.zip` }
}
