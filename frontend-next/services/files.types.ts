import type { FileItem, TaskOption } from "@/components/files/file-types"

export interface FileManagerState {
  files: FileItem[]
  taskOptions: TaskOption[]
  recentIds: string[]
}

export interface FileListItem {
  id: string
  name: string
  type: string
  size: string
  modifiedAt: string
  folder: string
}

export interface FilesListResponse {
  files: FileListItem[]
  folders: string[]
  storage: {
    used: string
    total: number
    unit: string
  }
}
