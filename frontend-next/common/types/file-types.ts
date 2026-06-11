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
  /** 서버 디스크 저장 키 */
  storageKey?: string
  mimeType?: string
  hasContent?: boolean
  /** storageKey는 있으나 서버 디스크에 본문 없음 */
  contentMissing?: boolean
}

export interface TaskOption {
  id: string
  name: string
  /** 업무가 속한 사업의 연도 (연도별 필터링용) */
  year?: string
  /** 업무가 속한 대분류(사업명=칸반 프로젝트명) */
  majorCategory?: string
}
