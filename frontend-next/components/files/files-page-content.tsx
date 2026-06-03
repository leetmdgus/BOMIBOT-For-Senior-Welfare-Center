"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable"
import {
  FolderOpen,
  FolderPlus,
  Grid3X3,
  HardDrive,
  List,
  Search,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { FileCard } from "./file-card"
import { FileList } from "./file-list"
import { FilesBreadcrumb } from "./files-breadcrumb"
import { RecentFiles } from "./recent-files"
import { RenameDialog } from "./rename-dialog"
import { ShareDialog } from "./share-dialog"
import { SortControl } from "./sort-control"
import { TaskFilterControl } from "./task-filter-control"
import { SelectionToolbar } from "./selection-toolbar"
import { UploadDialog } from "./upload-dialog"
import { NewFolderDialog } from "./new-folder-dialog"
import { FilePreviewDialog } from "./file-preview-dialog"
import { useFileManager } from "./use-file-manager"
import type { FileItem } from "./file-types"
import {
  canMoveItem,
  FILE_DRAG_MOVE_THRESHOLD_PX,
  getBreadcrumbs,
} from "./file-utils"
import { useAuth } from "@/components/auth/auth-provider"
import { Header } from "../common/header"

function CurrentFolderDropArea({ children }: { children: ReactNode }) {
  const rootDrop = useDroppable({ id: "folder:current" })

  return (
    <div
      ref={rootDrop.setNodeRef}
      className={rootDrop.isOver ? "p-6 ring-2 ring-primary/40" : "p-6"}
    >
      {children}
    </div>
  )
}

function EmptyState({
  searching,
  onUpload,
}: {
  searching: boolean
  onUpload: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/40 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <FolderOpen className="size-8 text-muted-foreground" />
      </div>
      {searching ? (
        <>
          <p className="text-sm font-medium">검색 결과가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            다른 검색어나 필터로 다시 시도해 보세요.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">이 폴더가 비어 있어요</p>
          <p className="text-sm text-muted-foreground">
            파일을 끌어다 놓거나 업로드 버튼을 눌러 추가하세요.
          </p>
          <Button className="mt-2 gap-2" onClick={onUpload}>
            <Upload className="size-4" />
            파일 업로드
          </Button>
        </>
      )}
    </div>
  )
}

export function FilesPageContent() {
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const manager = useFileManager()
  const shareLinkHandledRef = useRef<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dragOrderIds, setDragOrderIds] = useState<string[] | null>(null)
  const [isOsDragging, setIsOsDragging] = useState(false)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([])
  const osDragDepthRef = useRef(0)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 12 },
    }),
  )

  // OS(바탕화면 등)에서 끌어온 파일 드래그인지 판별
  const isOsFileDrag = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types).includes("Files")

  const handleOsDragEnter = (event: React.DragEvent) => {
    if (!isOsFileDrag(event)) return
    event.preventDefault()
    osDragDepthRef.current += 1
    setIsOsDragging(true)
  }

  const handleOsDragOver = (event: React.DragEvent) => {
    if (!isOsFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleOsDragLeave = (event: React.DragEvent) => {
    if (!isOsFileDrag(event)) return
    osDragDepthRef.current = Math.max(0, osDragDepthRef.current - 1)
    if (osDragDepthRef.current === 0) setIsOsDragging(false)
  }

  const handleOsDrop = (event: React.DragEvent) => {
    if (!isOsFileDrag(event)) return
    event.preventDefault()
    osDragDepthRef.current = 0
    setIsOsDragging(false)
    const dropped = Array.from(event.dataTransfer.files)
    if (dropped.length === 0) return
    setPendingUploadFiles(dropped)
    manager.setUploadOpen(true)
  }

  const navigateToFolder = (folderId: string | null) => {
    manager.setCurrentFolderId(folderId)
    manager.setSelectedIds([])
  }

  const atRoot = !manager.currentFolderId && !manager.useFlatView

  const breadcrumbs = getBreadcrumbs(manager.files, manager.currentFolderId)
  const visibleIds = useMemo(
    () => manager.visibleFiles.map((item) => item.id),
    [manager.visibleFiles],
  )
  const orderedIds = dragOrderIds ?? visibleIds
  const orderedVisibleFiles = useMemo(() => {
    if (!dragOrderIds) return manager.visibleFiles
    const byId = new Map(manager.visibleFiles.map((f) => [f.id, f]))
    return dragOrderIds.map((id) => byId.get(id)).filter(Boolean) as typeof manager.visibleFiles
  }, [dragOrderIds, manager.visibleFiles])

  useEffect(() => {
    const shareId = searchParams.get("share")?.trim()
    if (!shareId || manager.files.length === 0) return
    if (shareLinkHandledRef.current === shareId) return

    const target = manager.files.find((file) => file.id === shareId)
    if (!target) return

    shareLinkHandledRef.current = shareId

    if (target.type === "folder") {
      manager.setCurrentFolderId(target.id)
      manager.setSelectedIds([])
      return
    }

    if (target.parentId !== manager.currentFolderId) {
      manager.setCurrentFolderId(target.parentId)
    }
    manager.setSelectedIds([target.id])

    if (target.permission === "public") {
      manager.setPreviewTarget(target)
    }
  }, [
    searchParams,
    manager.files,
    manager.currentFolderId,
    manager.setCurrentFolderId,
    manager.setSelectedIds,
  ])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
    setDragOrderIds(visibleIds)
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!dragOrderIds) return
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return
    if (overId.startsWith("folder:")) return
    const overItem = manager.files.find((file) => file.id === overId)
    // 폴더 위에 올렸을 땐 "정렬"이 아니라 "폴더로 이동" 의도가 더 크므로 미리정렬은 하지 않음
    if (overItem?.type === "folder") return
    if (overId === activeId) return
    const oldIndex = dragOrderIds.indexOf(activeId)
    const newIndex = dragOrderIds.indexOf(overId)
    if (oldIndex < 0 || newIndex < 0) return
    setDragOrderIds(arrayMove(dragOrderIds, oldIndex, newIndex))
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
    setDragOrderIds(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    setActiveDragId(null)
    setDragOrderIds(null)

    if (!overId) return

    const distance = Math.hypot(event.delta.x, event.delta.y)
    if (distance < FILE_DRAG_MOVE_THRESHOLD_PX) return

    if (overId === activeId || overId === `folder:${activeId}`) return

    // 폴더 카드/행 위에 드롭하면 해당 폴더로 이동
    if (!overId.startsWith("folder:")) {
      const overItem = manager.files.find((file) => file.id === overId)
      if (overItem?.type === "folder") {
        if (manager.selectedIds.includes(activeId) && manager.selectedIds.length > 1) {
          const movable = manager.selectedIds.filter((id) =>
            canMoveItem(manager.files, id, overItem.id),
          )
          if (movable.length === 0) return
          manager.moveSelected(overItem.id)
          return
        }
        if (!canMoveItem(manager.files, activeId, overItem.id)) return
        manager.moveItem(activeId, overItem.id)
        return
      }
    }

    // 같은 폴더 안에서 "칸반처럼" 순서 변경 (drop 대상이 파일/폴더 아이템)
    if (!overId.startsWith("folder:") && dragOrderIds && dragOrderIds.length > 0) {
      manager.setCurrentFolderOrder(dragOrderIds)
      return
    }

    const targetFolderId = (() => {
      if (overId === "folder:current") return manager.currentFolderId
      if (overId === "folder:parent") return manager.parentFolderId
      if (overId === "folder:root") return null
      if (overId.startsWith("folder:")) return overId.replace("folder:", "")

      const overItem = manager.files.find((file) => file.id === overId)
      return overItem?.type === "folder" ? overItem.id : undefined
    })()

    if (targetFolderId === undefined) return

    if (manager.selectedIds.includes(activeId) && manager.selectedIds.length > 1) {
      const movable = manager.selectedIds.filter((id) =>
        canMoveItem(manager.files, id, targetFolderId),
      )
      if (movable.length === 0) return
      manager.moveSelected(targetFolderId)
      return
    }

    if (!canMoveItem(manager.files, activeId, targetFolderId)) return

    manager.moveItem(activeId, targetFolderId)
  }

  const commonActions = {
    onOpen: manager.openItem,
    onSelect: manager.toggleSelect,
    onCopy: manager.copyItem,
    onRename: manager.setRenameTarget,
    onShare: manager.setShareTarget,
    onToggleStar: manager.toggleStar,
    onDelete: manager.deleteItem,
    onExport: (item: FileItem) => {
      void manager.exportItem(item)
    },
    onDownload: (item: FileItem) => {
      void manager.downloadItem(item)
    },
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header />
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <FilesBreadcrumb trail={breadcrumbs} onNavigate={navigateToFolder} />

          <div className="flex shrink-0 items-center gap-3">
            <Button className="gap-2" onClick={() => manager.setUploadOpen(true)}>
              <Upload className="size-4" />
              파일 업로드
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => manager.setNewFolderOpen(true)}
            >
              <FolderPlus className="size-4" />
              새 폴더
            </Button>
          </div>
        </div>
      </div>

      <main
        className="relative flex-1 overflow-hidden"
        onDragEnter={handleOsDragEnter}
        onDragOver={handleOsDragOver}
        onDragLeave={handleOsDragLeave}
        onDrop={handleOsDrop}
      >
        {isOsDragging && (
          <div className="pointer-events-none absolute inset-0 z-20 m-4 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[2px]">
            <Upload className="size-10 text-primary" />
            <p className="text-base font-medium text-primary">
              여기에 파일을 놓아 업로드
            </p>
            <p className="text-sm text-muted-foreground">
              {breadcrumbs.length > 0
                ? `「${breadcrumbs[breadcrumbs.length - 1].name}」 폴더에 업로드됩니다`
                : "현재 폴더에 업로드됩니다"}
            </p>
          </div>
        )}
        <div className="h-full overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
          >
            <CurrentFolderDropArea>
            <div className="mb-6 flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="파일 검색..."
                    value={manager.searchQuery}
                    onChange={(event) => manager.setSearchQuery(event.target.value)}
                    className="w-64 pl-9"
                  />
                </div>
                <TaskFilterControl
                  value={manager.taskFilterId}
                  taskOptions={manager.taskOptions}
                  onChange={manager.setTaskFilterId}
                />
                <SortControl value={manager.sortKey} onChange={manager.setSortKey} />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={manager.viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => manager.setViewMode("grid")}
                >
                  <Grid3X3 className="size-4" />
                </Button>
                <Button
                  variant={manager.viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => manager.setViewMode("list")}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>

            {manager.taskFilterLabel && (
              <p className="mb-4 text-sm text-muted-foreground">
                업무 「{manager.taskFilterLabel}」 기준으로{" "}
                {manager.visibleFiles.length}개 항목을 표시합니다.
                {manager.useFlatView ? " (폴더 구분 없이 전체 경로)" : ""}
              </p>
            )}

            <SelectionToolbar
              count={manager.selectedIds.length}
              onClear={manager.clearSelection}
              onCopy={manager.copySelected}
              onToggleStar={manager.toggleSelectedStar}
              onDelete={manager.deleteSelected}
              onExport={() => {
                void manager.exportSelected()
              }}
              onUpdatePermissions={manager.updateSelectedPermissions}
            />

            {atRoot && (
              <>
                <RecentFiles items={manager.recentFiles} onOpen={manager.openItem} />

                <div className="mb-6 rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HardDrive className="size-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">저장 공간</p>
                        <p className="text-xs text-muted-foreground">12.4 GB / 50 GB 사용 중</p>
                      </div>
                    </div>
                    <div className="w-48">
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 w-1/4 rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {orderedVisibleFiles.length === 0 ? (
              <EmptyState
                searching={manager.useFlatView}
                onUpload={() => manager.setUploadOpen(true)}
              />
            ) : manager.viewMode === "grid" ? (
              <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {orderedVisibleFiles.map((item) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      selected={manager.selectedIds.includes(item.id)}
                      {...commonActions}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                <FileList
                  items={orderedVisibleFiles}
                  selectedIds={manager.selectedIds}
                  {...commonActions}
                />
              </SortableContext>
            )}
          </CurrentFolderDropArea>

          <DragOverlay>
            {activeDragId ? (
              <div className="w-56 rounded-lg border bg-white px-3 py-2 text-sm shadow-lg">
                {manager.files.find((f) => f.id === activeDragId)?.name ?? "파일"}
              </div>
            ) : null}
          </DragOverlay>
          </DndContext>
        </div>
      </main>

      <ShareDialog
        item={manager.shareTarget}
        regionId={session?.regionId}
        onOpenChange={(open) => !open && manager.setShareTarget(null)}
        onSave={manager.updatePermissions}
      />
      <RenameDialog
        item={manager.renameTarget}
        onOpenChange={(open) => !open && manager.setRenameTarget(null)}
        onSave={manager.renameItem}
      />
      <UploadDialog
        open={manager.uploadOpen}
        taskOptions={manager.taskOptions}
        defaultTaskId={manager.taskFilterId}
        initialFiles={pendingUploadFiles}
        onOpenChange={(open) => {
          manager.setUploadOpen(open)
          if (!open) setPendingUploadFiles([])
        }}
        onUpload={manager.uploadFiles}
      />
      <NewFolderDialog
        open={manager.newFolderOpen}
        onOpenChange={manager.setNewFolderOpen}
        onCreate={manager.createFolder}
      />
      <FilePreviewDialog
        item={manager.previewTarget}
        onOpenChange={(open) => !open && manager.setPreviewTarget(null)}
      />
    </div>
  )
}
