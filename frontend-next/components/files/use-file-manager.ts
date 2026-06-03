"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { isFastApiMode } from "@/lib/api-client"
import { triggerBlobDownload } from "@/lib/files/download-blob"
import {
  copyFile,
  createFile,
  deleteFile,
  downloadFileBlob,
  downloadFileToDisk,
  exportFilesArchive,
  getFileManagerState,
  patchFile,
  saveFileManagerState,
  uploadFilesToServer,
} from "@/services/files.service"
import type { FileItem, Permission, SortKey, TaskOption, ViewMode } from "./file-types"
import {
  canMoveItem,
  collectDescendantIds,
  getTypeByFileName,
  sortFiles,
} from "./file-utils"
import { syncFileTaskNames } from "@/lib/files/sync-file-task-names"
import { TASK_FILTER_NONE } from "./task-filter-control"
import type { FileManagerState } from "@/services/files.types"

function matchesTaskFilter(item: FileItem, taskFilterId: string | null): boolean {
  if (!taskFilterId) return true
  if (taskFilterId === TASK_FILTER_NONE) return !item.taskId
  return item.taskId === taskFilterId
}

function mapApiFile(raw: Record<string, unknown>): FileItem {
  return {
    id: String(raw.id),
    name: String(raw.name),
    type: raw.type as FileItem["type"],
    parentId: (raw.parentId as string | null) ?? null,
    size: raw.size ? String(raw.size) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    modifiedAt: String(raw.modifiedAt ?? new Date().toISOString()),
    permission: (raw.permission as Permission) ?? "private",
    shared: Boolean(raw.shared),
    starred: Boolean(raw.starred),
    taskId: raw.taskId ? String(raw.taskId) : undefined,
    taskName: raw.taskName ? String(raw.taskName) : undefined,
    storageKey: raw.storageKey ? String(raw.storageKey) : undefined,
    mimeType: raw.mimeType ? String(raw.mimeType) : undefined,
    hasContent: Boolean(raw.hasContent),
    contentMissing: Boolean(raw.contentMissing),
  }
}

export function useFileManager() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [searchQuery, setSearchQuery] = useState("")
  const [taskFilterId, setTaskFilterId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [folderOrderByParentId, setFolderOrderByParentId] = useState<
    NonNullable<FileManagerState["folderOrderByParentId"]>
  >({})
  const [managerTaskOptions, setManagerTaskOptions] = useState<TaskOption[]>([])
  const hydratedRef = useRef(false)

  const refreshFromServer = useCallback(async () => {
    const state = await getFileManagerState()
    const options = state.taskOptions
    setManagerTaskOptions(options)
    setFiles(syncFileTaskNames(state.files, options))
    setRecentIds(state.recentIds)
    setFolderOrderByParentId(state.folderOrderByParentId ?? {})
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    refreshFromServer().catch((error) => {
      console.error("파일 관리 데이터 로드 실패:", error)
    })
  }, [refreshFromServer])

  useEffect(() => {
    if (!isFastApiMode() || !hydratedRef.current) return
    const timer = setTimeout(() => {
      void saveFileManagerState({
        recentIds,
        folderOrderByParentId,
      }).catch((error) => {
        console.error("파일 관리 상태 저장 실패:", error)
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [recentIds, folderOrderByParentId])

  useEffect(() => {
    if (isFastApiMode() || !hydratedRef.current || files.length === 0) return
    const timer = setTimeout(() => {
      void saveFileManagerState({
        files,
        recentIds,
        folderOrderByParentId,
      }).catch((error) => {
        console.error("파일 트리 저장 실패:", error)
      })
    }, 1200)
    return () => clearTimeout(timer)
  }, [files, recentIds, folderOrderByParentId])

  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null)

  const setCurrentFolderOrder = (orderedIds: string[]) => {
    const key = currentFolderId ?? "root"
    setFolderOrderByParentId((prev) => ({ ...prev, [key]: orderedIds }))
  }

  const parentFolderId = useMemo(() => {
    return files.find((item) => item.id === currentFolderId)?.parentId ?? null
  }, [files, currentFolderId])

  const useFlatView = Boolean(searchQuery.trim()) || taskFilterId !== null

  const visibleFiles = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    const scopedFiles = files.filter((item) => {
      if (!matchesTaskFilter(item, taskFilterId)) return false
      if (useFlatView) {
        if (keyword) return item.name.toLowerCase().includes(keyword)
        return true
      }
      return item.parentId === currentFolderId
    })

    const sorted = sortFiles(scopedFiles, sortKey)
    if (useFlatView || sortKey !== "name") return sorted

    const key = currentFolderId ?? "root"
    const order = folderOrderByParentId[key]
    if (!order || order.length === 0) return sorted
    const indexById = new Map(order.map((id, index) => [id, index]))
    return [...sorted].sort((a, b) => {
      const ia = indexById.get(a.id)
      const ib = indexById.get(b.id)
      if (ia === undefined && ib === undefined) return 0
      if (ia === undefined) return 1
      if (ib === undefined) return -1
      return ia - ib
    })
  }, [files, currentFolderId, searchQuery, sortKey, taskFilterId, useFlatView])

  const taskFilterLabel = useMemo(() => {
    if (!taskFilterId) return null
    if (taskFilterId === TASK_FILTER_NONE) return "업무 미지정"
    return managerTaskOptions.find((t) => t.id === taskFilterId)?.name ?? null
  }, [taskFilterId, managerTaskOptions])

  const recentFiles = useMemo(() => {
    return recentIds
      .map((id) => files.find((item) => item.id === id))
      .filter(Boolean) as FileItem[]
  }, [files, recentIds])

  const selectedItems = useMemo(() => {
    return files.filter((item) => selectedIds.includes(item.id))
  }, [files, selectedIds])

  const addRecent = (id: string) => {
    setRecentIds((prev) => [id, ...prev.filter((itemId) => itemId !== id)].slice(0, 8))
  }

  const downloadItem = async (item: FileItem) => {
    if (item.type === "folder") {
      await exportItem(item)
      return
    }

    if (!item.hasContent) {
      window.alert(
        "이 항목은 예시 데이터입니다. 「파일 업로드」로 올린 파일만 다운로드할 수 있습니다.",
      )
      return
    }

    try {
      if (downloadFileToDisk) {
        await downloadFileToDisk(item.id, item.name)
        return
      }
      if (downloadFileBlob) {
        const blob = await downloadFileBlob(item.id)
        triggerBlobDownload(blob, item.name)
      }
    } catch (error) {
      console.error("파일 다운로드 실패:", error)
      window.alert(
        error instanceof Error ? error.message : "파일을 다운로드하지 못했습니다.",
      )
    }
  }

  const openItem = async (item: FileItem) => {
    addRecent(item.id)

    if (item.type === "folder") {
      setCurrentFolderId(item.id)
      setSelectedIds([])
      return
    }

    setPreviewTarget(item)
  }

  const toggleSelect = (id: string, additive = true) => {
    setSelectedIds((prev) => {
      if (!additive) return prev.includes(id) && prev.length === 1 ? [] : [id]
      return prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    })
  }

  const clearSelection = () => setSelectedIds([])

  const copyItem = async (item: FileItem) => {
    if (isFastApiMode() && copyFile) {
      try {
        const created = await copyFile(item.id, { parentId: currentFolderId })
        setFiles((prev) => [...prev, mapApiFile(created as unknown as Record<string, unknown>)])
        return
      } catch (error) {
        console.error("파일 복사 실패:", error)
        window.alert("파일 복사에 실패했습니다.")
        return
      }
    }

    const now = new Date().toISOString()
    setFiles((prev) => [
      ...prev,
      {
        ...item,
        id: crypto.randomUUID(),
        name: `${item.name} 사본`,
        createdAt: now,
        modifiedAt: now,
        parentId: currentFolderId,
      },
    ])
  }

  const copySelected = async () => {
    for (const item of selectedItems) {
      await copyItem(item)
    }
  }

  const renameItem = async (itemId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return

    if (isFastApiMode() && patchFile) {
      try {
        const updated = await patchFile(itemId, { name: nextName })
        const mapped = mapApiFile(updated)
        setFiles((prev) =>
          prev.map((item) => (item.id === itemId ? mapped : item)),
        )
        return
      } catch (error) {
        console.error("이름 변경 실패:", error)
        window.alert("이름 변경에 실패했습니다.")
        return
      }
    }

    setFiles((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, name: nextName, modifiedAt: new Date().toISOString() }
          : item,
      ),
    )
  }

  const updatePermissions = async (itemId: string, permission: Permission) => {
    const patch = {
      permission,
      shared: permission !== "private",
    }

    if (isFastApiMode() && patchFile) {
      try {
        const updated = await patchFile(itemId, patch)
        const mapped = mapApiFile(updated)
        setFiles((prev) =>
          prev.map((item) => (item.id === itemId ? mapped : item)),
        )
        return
      } catch (error) {
        console.error("권한 변경 실패:", error)
        window.alert("권한 변경에 실패했습니다.")
        return
      }
    }

    setFiles((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              modifiedAt: new Date().toISOString(),
            }
          : item,
      ),
    )
  }

  const updateSelectedPermissions = async (permission: Permission) => {
    for (const id of selectedIds) {
      await updatePermissions(id, permission)
    }
  }

  const toggleStar = async (item: FileItem) => {
    const next = !item.starred
    if (isFastApiMode() && patchFile) {
      try {
        const updated = await patchFile(item.id, { starred: next })
        const mapped = mapApiFile(updated)
        setFiles((prev) =>
          prev.map((file) => (file.id === item.id ? mapped : file)),
        )
        return
      } catch (error) {
        console.error("즐겨찾기 변경 실패:", error)
        return
      }
    }

    setFiles((prev) =>
      prev.map((file) =>
        file.id === item.id
          ? { ...file, starred: next, modifiedAt: new Date().toISOString() }
          : file,
      ),
    )
  }

  const toggleSelectedStar = async () => {
    for (const item of selectedItems) {
      await toggleStar(item)
    }
  }

  const deleteItem = async (item: FileItem) => {
    const idsToDelete = new Set([item.id])
    if (item.type === "folder") {
      collectDescendantIds(files, item.id).forEach((id) => idsToDelete.add(id))
    }

    if (isFastApiMode()) {
      try {
        await deleteFile(item.id)
      } catch (error) {
        console.error("파일 삭제 실패:", error)
        window.alert("파일 삭제에 실패했습니다.")
        return
      }
    }

    setFiles((prev) => prev.filter((file) => !idsToDelete.has(file.id)))
    setSelectedIds((prev) => prev.filter((id) => !idsToDelete.has(id)))
    setRecentIds((prev) => prev.filter((id) => !idsToDelete.has(id)))
  }

  const deleteSelected = async () => {
    if (isFastApiMode()) {
      for (const item of selectedItems) {
        try {
          await deleteFile(item.id)
        } catch (error) {
          console.error("파일 삭제 실패:", error)
        }
      }
      await refreshFromServer()
      setSelectedIds([])
      return
    }

    const idsToDelete = new Set<string>()
    selectedItems.forEach((item) => {
      idsToDelete.add(item.id)
      if (item.type === "folder") {
        collectDescendantIds(files, item.id).forEach((id) => idsToDelete.add(id))
      }
    })

    setFiles((prev) => prev.filter((file) => !idsToDelete.has(file.id)))
    setSelectedIds([])
  }

  const moveItem = async (itemId: string, targetFolderId: string | null) => {
    if (!canMoveItem(files, itemId, targetFolderId)) return

    if (isFastApiMode() && patchFile) {
      try {
        const updated = await patchFile(itemId, { parentId: targetFolderId })
        const mapped = mapApiFile(updated)
        setFiles((prev) =>
          prev.map((item) => (item.id === itemId ? mapped : item)),
        )
        return
      } catch (error) {
        console.error("이동 실패:", error)
        window.alert("파일 이동에 실패했습니다.")
        return
      }
    }

    setFiles((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, parentId: targetFolderId, modifiedAt: new Date().toISOString() }
          : item,
      ),
    )
  }

  const moveSelected = async (targetFolderId: string | null) => {
    for (const id of selectedIds) {
      if (canMoveItem(files, id, targetFolderId)) {
        await moveItem(id, targetFolderId)
      }
    }
  }

  const goToParentFolder = () => {
    setCurrentFolderId(parentFolderId)
    setSelectedIds([])
  }

  const createFolder = async (name: string) => {
    const nextName = name.trim()
    if (!nextName) return

    const parentFolder = currentFolderId
      ? files.find((item) => item.id === currentFolderId)
      : null
    const taskId =
      taskFilterId && taskFilterId !== TASK_FILTER_NONE
        ? taskFilterId
        : parentFolder?.taskId
    const task = taskId
      ? managerTaskOptions.find((item) => item.id === taskId)
      : undefined

    try {
      const created = await createFile({
        name: nextName,
        type: "folder",
        parentId: currentFolderId,
        permission: "private",
        ...(taskId ? { taskId, taskName: task?.name } : {}),
      })
      setFiles((prev) => [
        ...prev,
        syncFileTaskNames(
          [mapApiFile(created as Record<string, unknown>)],
          managerTaskOptions,
        )[0],
      ])
    } catch (error) {
      console.error("폴더 생성 실패:", error)
      window.alert(
        error instanceof Error ? error.message : "폴더 생성에 실패했습니다.",
      )
    }
  }

  const uploadFiles = async (uploadedFiles: File[], taskId: string) => {
    if (isFastApiMode() && uploadFilesToServer) {
      const created = await uploadFilesToServer({
        files: uploadedFiles,
        parentId: currentFolderId,
        taskId: taskId || undefined,
      })
      const mapped = syncFileTaskNames(
        created.map((raw) =>
          mapApiFile(raw as unknown as Record<string, unknown>),
        ),
        managerTaskOptions,
      )
      setFiles((prev) => [...prev, ...mapped])
      return
    }

    const task = managerTaskOptions.find((item) => item.id === taskId)
    const now = new Date().toISOString()

    setFiles((prev) => [
      ...prev,
      ...uploadedFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: getTypeByFileName(file.name),
        parentId: currentFolderId,
        size: `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`,
        createdAt: now,
        modifiedAt: now,
        permission: "private" as const,
        taskId: task?.id,
        taskName: task?.name,
        hasContent: true,
      })),
    ])
  }

  const exportItem = async (item: FileItem) => {
    try {
      if (exportFilesArchive) {
        await exportFilesArchive([item.id], item.name)
        return
      }
      window.alert("보내기를 사용할 수 없습니다.")
    } catch (error) {
      console.error("export 실패:", error)
      window.alert(
        error instanceof Error ? error.message : "보내기에 실패했습니다.",
      )
    }
  }

  const exportSelected = async () => {
    if (selectedIds.length === 0) return

    const label =
      selectedIds.length === 1
        ? files.find((f) => f.id === selectedIds[0])?.name ?? "selected-files"
        : "selected-files"

    try {
      if (exportFilesArchive) {
        await exportFilesArchive(selectedIds, label)
        return
      }
    } catch (error) {
      console.error("선택 export 실패:", error)
      window.alert(
        error instanceof Error ? error.message : "보내기에 실패했습니다.",
      )
    }
  }

  return {
    files,
    taskOptions: managerTaskOptions,
    currentFolderId,
    parentFolderId,
    visibleFiles,
    recentFiles,
    selectedIds,
    setSelectedIds,
    selectedItems,
    viewMode,
    sortKey,
    searchQuery,
    taskFilterId,
    taskFilterLabel,
    useFlatView,
    setTaskFilterId,
    renameTarget,
    shareTarget,
    previewTarget,
    setPreviewTarget,
    uploadOpen,
    newFolderOpen,
    setCurrentFolderId,
    setViewMode,
    setSortKey,
    setSearchQuery,
    setRenameTarget,
    setShareTarget,
    setUploadOpen,
    setNewFolderOpen,
    openItem,
    downloadItem,
    toggleSelect,
    clearSelection,
    copyItem,
    copySelected,
    renameItem,
    updatePermissions,
    updateSelectedPermissions,
    toggleStar,
    toggleSelectedStar,
    deleteItem,
    deleteSelected,
    moveItem,
    moveSelected,
    goToParentFolder,
    createFolder,
    uploadFiles,
    exportItem,
    exportSelected,
    setCurrentFolderOrder,
  }
}
