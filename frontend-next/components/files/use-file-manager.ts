"use client"

import { useMemo, useState } from "react"

import { initialFiles, taskOptions } from "./file-data"
import type { FileItem, Permission, SortKey, ViewMode } from "./file-types"
import { canMoveItem, collectDescendantIds, exportItemsAsJson, getTypeByFileName, sortFiles } from "./file-utils"

export function useFileManager() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [recentIds, setRecentIds] = useState<string[]>(["folder-1", "file-1", "file-2", "folder-3"])
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const parentFolderId = useMemo(() => {
    return files.find((item) => item.id === currentFolderId)?.parentId ?? null
  }, [files, currentFolderId])

  const visibleFiles = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    const scopedFiles = keyword
      ? files.filter((item) => item.name.toLowerCase().includes(keyword))
      : files.filter((item) => item.parentId === currentFolderId)

    return sortFiles(scopedFiles, sortKey)
  }, [files, currentFolderId, searchQuery, sortKey])

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

  const openItem = (item: FileItem) => {
    addRecent(item.id)

    if (item.type === "folder") {
      setCurrentFolderId(item.id)
      setSelectedIds([])
      return
    }

    window.alert(`${item.name} 파일을 엽니다.`)
  }

  const toggleSelect = (id: string, additive = true) => {
    setSelectedIds((prev) => {
      if (!additive) return prev.includes(id) && prev.length === 1 ? [] : [id]
      return prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    })
  }

  const clearSelection = () => setSelectedIds([])

  const copyItem = (item: FileItem) => {
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

  const copySelected = () => {
    const now = new Date().toISOString()
    setFiles((prev) => [
      ...prev,
      ...selectedItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        name: `${item.name} 사본`,
        createdAt: now,
        modifiedAt: now,
        parentId: currentFolderId,
      })),
    ])
  }

  const renameItem = (itemId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return

    setFiles((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, name: nextName, modifiedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const updatePermissions = (itemId: string, permission: Permission) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              permission,
              shared: permission !== "private",
              modifiedAt: new Date().toISOString(),
            }
          : item
      )
    )
  }

  const updateSelectedPermissions = (permission: Permission) => {
    setFiles((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              permission,
              shared: permission !== "private",
              modifiedAt: new Date().toISOString(),
            }
          : item
      )
    )
  }

  const toggleStar = (item: FileItem) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === item.id
          ? { ...file, starred: !file.starred, modifiedAt: new Date().toISOString() }
          : file
      )
    )
  }

  const toggleSelectedStar = () => {
    setFiles((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? { ...item, starred: !item.starred, modifiedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const deleteItem = (item: FileItem) => {
    const idsToDelete = new Set([item.id])
    if (item.type === "folder") {
      collectDescendantIds(files, item.id).forEach((id) => idsToDelete.add(id))
    }

    setFiles((prev) => prev.filter((file) => !idsToDelete.has(file.id)))
    setSelectedIds((prev) => prev.filter((id) => !idsToDelete.has(id)))
  }

  const deleteSelected = () => {
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

  const moveItem = (itemId: string, targetFolderId: string | null) => {
    if (!canMoveItem(files, itemId, targetFolderId)) return

    setFiles((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, parentId: targetFolderId, modifiedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const moveSelected = (targetFolderId: string | null) => {
    setFiles((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id) && canMoveItem(prev, item.id, targetFolderId)
          ? { ...item, parentId: targetFolderId, modifiedAt: new Date().toISOString() }
          : item
      )
    )
  }

  const goToParentFolder = () => {
    setCurrentFolderId(parentFolderId)
    setSelectedIds([])
  }

  const createFolder = (name: string) => {
    const now = new Date().toISOString()
    const nextName = name.trim()

    if (!nextName) return

    setFiles((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: nextName,
        type: "folder",
        parentId: currentFolderId,
        createdAt: now,
        modifiedAt: now,
        permission: "private",
      },
    ])
  }

  const uploadFiles = (uploadedFiles: File[], taskId: string) => {
    const task = taskOptions.find((item) => item.id === taskId)
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
      })),
    ])
  }

  const exportItem = (item: FileItem) => {
    exportItemsAsJson(files, [item.id], `${item.name}.export.json`)
  }

  const exportSelected = () => {
    if (selectedIds.length === 0) return
    exportItemsAsJson(files, selectedIds, `selected-files.export.json`)
  }

  return {
    files,
    taskOptions,
    currentFolderId,
    parentFolderId,
    visibleFiles,
    recentFiles,
    selectedIds,
    selectedItems,
    viewMode,
    sortKey,
    searchQuery,
    renameTarget,
    shareTarget,
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
  }
}
