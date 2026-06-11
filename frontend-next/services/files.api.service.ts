import type { FileItem } from "@common/types/file-types"
import type { FileManagerState, FilesListResponse } from "./files.types"
import { cachedApiGet, invalidateApiGetCache } from "@/lib/api-get-cache"
import {
  apiClient,
  apiFetchBlobWithMeta,
  apiUploadFormData,
  resolveApiPath,
} from "@/lib/api-client"
import { triggerBlobDownload } from "@/lib/files/download-blob"

const filesPath = (suffix = "") =>
  resolveApiPath(`/api/files${suffix}`, `/api/v1/files${suffix}`)

const fileManagerPath = resolveApiPath(
  "/api/files/manager",
  "/api/v1/files/manager",
)

export async function getFileManagerState(): Promise<FileManagerState> {
  return cachedApiGet(fileManagerPath, () => apiClient.get<FileManagerState>(fileManagerPath), {
    key: "files:manager",
    ttlMs: 30_000,
  })
}

export async function getFilesList(params?: {
  folder?: string
  type?: string
  search?: string
}): Promise<FilesListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.folder) searchParams.set("folder", params.folder)
  if (params?.type) searchParams.set("type", params.type)
  if (params?.search) searchParams.set("search", params.search)
  const query = searchParams.toString()
  return apiClient.get<FilesListResponse>(
    filesPath(query ? `?${query}` : ""),
  )
}

export async function createFile(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await apiClient.post<Record<string, unknown>>(filesPath(), body)
  invalidateApiGetCache("files:manager")
  return result
}

export async function deleteFile(id: string): Promise<{
  success: boolean
  deletedId: string
  deletedIds?: string[]
}> {
  const result = await apiClient.delete<{
    success: boolean
    deletedId: string
    deletedIds?: string[]
  }>(`${filesPath()}?id=${encodeURIComponent(id)}`)
  invalidateApiGetCache("files:manager")
  return result
}

export async function patchFile(
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await apiClient.patch<Record<string, unknown>>(
    filesPath(`/${id}`),
    body,
  )
  invalidateApiGetCache("files:manager")
  return result
}

export async function saveFileManagerState(body: {
  files?: unknown[]
  recentIds?: string[]
  folderOrderByParentId?: Record<string, string[]>
}): Promise<FileManagerState> {
  const result = await apiClient.put<FileManagerState>(fileManagerPath, body)
  invalidateApiGetCache("files:manager")
  return result
}

export async function copyFile(
  fileId: string,
  body?: { parentId?: string | null; name?: string },
): Promise<FileItem> {
  const result = await apiClient.post<FileItem>(
    filesPath(`/${fileId}/copy`),
    body ?? {},
  )
  invalidateApiGetCache("files:manager")
  return result
}

export async function uploadFilesToServer(params: {
  files: File[]
  parentId?: string | null
  taskId?: string
}): Promise<FileItem[]> {
  const formData = new FormData()
  for (const file of params.files) {
    formData.append("files", file)
  }
  if (params.parentId) {
    formData.append("parentId", params.parentId)
    formData.append("parent_id", params.parentId)
  }
  if (params.taskId) {
    formData.append("taskId", params.taskId)
    formData.append("task_id", params.taskId)
  }

  const result = await apiUploadFormData<{ files: FileItem[] }>(
    resolveApiPath("/api/files/upload", "/api/v1/files/upload"),
    formData,
  )
  invalidateApiGetCache("files:manager")
  return result.files
}

export async function downloadFileBlob(fileId: string): Promise<Blob> {
  const { blob } = await apiFetchBlobWithMeta(
    resolveApiPath(
      `/api/files/${encodeURIComponent(fileId)}/content`,
      `/api/v1/files/${encodeURIComponent(fileId)}/content`,
    ),
  )
  return blob
}

export type FileSvgRenderResult = {
  format: string
  sourceFilename: string
  pageCount: number
  /** 페이지 순서대로 정렬된 SVG 문자열 (rhwp 정확 렌더) */
  pages: string[]
}

/** HWP/HWPX 파일(id)을 rhwp로 페이지별 SVG로 정확 렌더링한다. */
export async function renderFileSvg(
  fileId: string,
  fontMode = "",
): Promise<FileSvgRenderResult> {
  const query = fontMode ? `?font_mode=${encodeURIComponent(fontMode)}` : ""
  return apiClient.get<FileSvgRenderResult>(
    resolveApiPath(
      `/api/files/${encodeURIComponent(fileId)}/render-svg${query}`,
      `/api/v1/files/${encodeURIComponent(fileId)}/render-svg${query}`,
    ),
  )
}

export async function downloadFileToDisk(
  fileId: string,
  fallbackName: string,
): Promise<void> {
  const { blob, filename } = await apiFetchBlobWithMeta(
    resolveApiPath(
      `/api/files/${encodeURIComponent(fileId)}/content`,
      `/api/v1/files/${encodeURIComponent(fileId)}/content`,
    ),
  )
  triggerBlobDownload(blob, filename ?? fallbackName)
}

export async function exportFilesArchive(
  ids: string[],
  fallbackZipName: string,
): Promise<void> {
  if (ids.length === 0) return

  const path =
    ids.length === 1
      ? resolveApiPath(
          `/api/files/${encodeURIComponent(ids[0])}/export`,
          `/api/v1/files/${encodeURIComponent(ids[0])}/export`,
        )
      : resolveApiPath("/api/files/export", "/api/v1/files/export")

  const { blob, filename } =
    ids.length === 1
      ? await apiFetchBlobWithMeta(path)
      : await apiFetchBlobWithMeta(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        })

  triggerBlobDownload(blob, filename ?? `${fallbackZipName}.zip`)
}
