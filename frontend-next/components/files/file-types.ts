export type ViewMode = "grid" | "list"
export type SortKey = "name" | "modified" | "created"
export type Permission = "private" | "team" | "public"
export type FileType = "folder" | "document" | "image" | "spreadsheet" | "video" | "pdf" | "archive" | "etc"

export interface FileItem {
  id: string
  name: string
  type: FileType
  parentId: string | null
  size?: string
  createdAt: string
  modifiedAt: string
  shared?: boolean
  starred?: boolean
  permission: Permission
  taskId?: string
  taskName?: string
}

export interface TaskOption {
  id: string
  name: string
}
