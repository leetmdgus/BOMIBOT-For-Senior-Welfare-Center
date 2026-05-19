import type { FileManagerState, FilesListResponse } from "./files.types"

export async function getFileManagerState(): Promise<FileManagerState> {
  const response = await fetch("/api/files/manager")

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
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
  const response = await fetch(`/api/files${query ? `?${query}` : ""}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  return response.json()
}
