import {
  defaultRecentIds,
  initialFiles,
  taskOptions,
} from "@/lib/mocks/files-manager.mock"
import { files as legacyFiles } from "@/lib/mocks/files.mock"
import type { FileManagerState, FilesListResponse } from "./files.types"

export async function getFileManagerState(): Promise<FileManagerState> {
  return {
    files: initialFiles,
    taskOptions,
    recentIds: defaultRecentIds,
  }
}

export async function getFilesList(params?: {
  folder?: string
  type?: string
  search?: string
}): Promise<FilesListResponse> {
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
      file.name.toLowerCase().includes(keyword)
    )
  }

  const folders = [...new Set(legacyFiles.map((file) => file.folder))]
  const storageUsed = legacyFiles.reduce((acc, file) => {
    const size = parseFloat(file.size)
    const unit = file.size.includes("MB") ? 1 : file.size.includes("GB") ? 1024 : 0.001
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
