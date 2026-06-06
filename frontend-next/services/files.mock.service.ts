import type { FileItem } from "@/components/files/file-types"
import { getTypeByFileName } from "@/components/files/file-utils"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import { buildFolderZipBlob } from "@/lib/files/build-folder-zip"
import { triggerBlobDownload } from "@/lib/files/download-blob"
import { loadKanbanTaskOptions } from "@/lib/files/kanban-task-options"
import { syncFileTaskNames } from "@/lib/files/sync-file-task-names"
import { filterFileTree } from "@/lib/files/file-access"
import {
  collectAccessibleTaskIds,
  shouldBypassProjectAccess,
} from "@/lib/kanban/project-access"
import { getProjects } from "@/services/kanban.board.mock.service"
import type { FileManagerState, FilesListResponse } from "./files.types"

const mockBlobByFileId = new Map<string, Blob>()

export async function renderFileSvg(): Promise<never> {
  // mock 모드(백엔드 rhwp 없음) → 실패시키면 미리보기가 office HTML 경로로 폴백
  throw new Error("rhwp 정확 렌더는 백엔드 연결이 필요합니다.")
}

export async function getFileManagerState(
  regionId?: RegionId,
): Promise<FileManagerState> {
  const store = await loadRegionStore({ regionId })

  const taskOptions = await loadKanbanTaskOptions((year) =>
    getProjects(year, regionId),
  )

  let files = syncFileTaskNames(store.filesManager.initialFiles, taskOptions)
  const bypass = await shouldBypassProjectAccess()
  let allowed: Set<string> | null = null
  if (!bypass) {
    const year = String(new Date().getFullYear())
    const projects = await getProjects(year, regionId)
    allowed = collectAccessibleTaskIds(projects)
    files = filterFileTree(files, allowed)
  }

  const filteredTaskOptions = bypass
    ? taskOptions
    : taskOptions.filter((opt) => allowed?.has(opt.id))

  return {
    files,
    taskOptions: filteredTaskOptions,
    recentIds: store.filesManager.defaultRecentIds,
    folderOrderByParentId: (store.filesManager as any).folderOrderByParentId ?? {},
  }
}

export async function getFilesList(
  params?: {
    folder?: string
    type?: string
    search?: string
  },
  regionId?: RegionId,
): Promise<FilesListResponse> {
  const store = await loadRegionStore({ regionId })

  let legacyFiles = store.files.files
  if (!(await shouldBypassProjectAccess())) {
    const year = String(new Date().getFullYear())
    const projects = await getProjects(year, regionId)
    const allowed = collectAccessibleTaskIds(projects)
    legacyFiles = legacyFiles.filter((file) => {
      const taskId = (file as { taskId?: string }).taskId
      return Boolean(taskId && allowed.has(taskId))
    })
  }

  let filteredFiles = legacyFiles

  if (params?.folder && params.folder !== "전체") {
    filteredFiles = filteredFiles.filter((file) => file.folder === params.folder)
  }

  if (params?.type && params.type !== "전체") {
    filteredFiles = filteredFiles.filter((file) => file.type === params.type)
  }

  if (params?.search) {
    const keyword = params.search.toLowerCase()
    filteredFiles = filteredFiles.filter((file) =>
      file.name.toLowerCase().includes(keyword),
    )
  }

  const folders = [...new Set(legacyFiles.map((file) => file.folder))]
  const storageUsed = legacyFiles.reduce((acc, file) => {
    const size = parseFloat(file.size)
    const unit = file.size.includes("MB")
      ? 1
      : file.size.includes("GB")
        ? 1024
        : 0.001
    return acc + size * unit
  }, 0)

  return {
    files: filteredFiles,
    folders,
    storage: {
      used: storageUsed.toFixed(1),
      total: 1000,
      unit: "MB",
    },
  }
}

export async function saveFileManagerState(
  body: {
    files?: unknown[]
    recentIds?: string[]
    folderOrderByParentId?: Record<string, string[]>
  },
  regionId?: RegionId,
): Promise<FileManagerState> {
  const store = await loadRegionStore({ regionId })
  if (body.files) {
    store.filesManager.initialFiles = body.files as FileManagerState["files"]
    store.files.files = body.files as typeof store.files.files
  }
  if (body.recentIds) {
    store.filesManager.defaultRecentIds = body.recentIds
  }
  if (body.folderOrderByParentId) {
    ;(store.filesManager as any).folderOrderByParentId = body.folderOrderByParentId
  }
  return getFileManagerState(regionId)
}

export async function createFile(
  body: Record<string, unknown>,
  regionId?: RegionId,
): Promise<Record<string, unknown>> {
  const state = await getFileManagerState(regionId)
  const now = new Date().toISOString()
  const created = {
    id: crypto.randomUUID(),
    name: String(body.name ?? "새 파일"),
    type: String(body.type ?? "document"),
    parentId: (body.parentId as string | null) ?? null,
    createdAt: now,
    modifiedAt: now,
    permission: "private",
    ...body,
  }
  await saveFileManagerState(
    { files: [...state.files, created as FileManagerState["files"][number]] },
    regionId,
  )
  return created
}

export async function deleteFile(
  id: string,
  regionId?: RegionId,
): Promise<{ success: boolean; deletedId: string }> {
  const state = await getFileManagerState(regionId)
  const idsToDelete = new Set<string>([id])
  const target = state.files.find((f) => f.id === id)
  if (target?.type === "folder") {
    const collect = (parentId: string) => {
      state.files
        .filter((f) => f.parentId === parentId)
        .forEach((child) => {
          idsToDelete.add(child.id)
          if (child.type === "folder") collect(child.id)
        })
    }
    collect(id)
  }
  idsToDelete.forEach((fileId) => mockBlobByFileId.delete(fileId))
  await saveFileManagerState(
    {
      files: state.files.filter((f) => !idsToDelete.has(f.id)),
      recentIds: state.recentIds.filter((rid) => !idsToDelete.has(rid)),
    },
    regionId,
  )
  return { success: true, deletedId: id }
}

export async function uploadFilesToServer(
  params: {
    files: File[]
    parentId?: string | null
    taskId?: string
  },
  regionId?: RegionId,
): Promise<FileItem[]> {
  const state = await getFileManagerState(regionId)
  const task = state.taskOptions.find((item) => item.id === params.taskId)
  const now = new Date().toISOString()

  const created = params.files.map((file) => {
    const id = crypto.randomUUID()
    mockBlobByFileId.set(id, file)
    return {
      id,
      name: file.name,
      type: getTypeByFileName(file.name),
      parentId: params.parentId ?? null,
      size: `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`,
      createdAt: now,
      modifiedAt: now,
      permission: "private" as const,
      taskId: task?.id,
      taskName: task?.name,
      storageKey: id,
      hasContent: true,
    } satisfies FileItem
  })

  await saveFileManagerState(
    {
      files: [...state.files, ...created],
      recentIds: state.recentIds,
    },
    regionId,
  )

  return created
}

export async function downloadFileBlob(fileId: string): Promise<Blob> {
  const blob = mockBlobByFileId.get(fileId)
  if (!blob) {
    throw new Error("업로드된 파일만 다운로드할 수 있습니다.")
  }
  return blob
}

export async function downloadFileToDisk(
  fileId: string,
  fallbackName: string,
): Promise<void> {
  const blob = await downloadFileBlob(fileId)
  triggerBlobDownload(blob, fallbackName)
}

export async function exportFilesArchive(
  ids: string[],
  fallbackZipName: string,
): Promise<void> {
  const state = await getFileManagerState()
  const { blob, filename } = await buildFolderZipBlob(
    state.files,
    ids,
    async (fileId) => mockBlobByFileId.get(fileId) ?? null,
  )
  triggerBlobDownload(blob, filename || `${fallbackZipName}.zip`)
}

export async function patchFile(
  id: string,
  body: Record<string, unknown>,
  regionId?: RegionId,
): Promise<Record<string, unknown>> {
  const state = await getFileManagerState(regionId)
  let patched: Record<string, unknown> | null = null
  const nextFiles = state.files.map((item) => {
    if (item.id !== id) return item
    patched = {
      ...item,
      ...body,
      modifiedAt: new Date().toISOString(),
    }
    return patched as FileManagerState["files"][number]
  })
  if (!patched) throw new Error("File not found")
  await saveFileManagerState({ files: nextFiles, recentIds: state.recentIds }, regionId)
  return patched
}
