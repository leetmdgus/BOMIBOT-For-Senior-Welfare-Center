"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
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
import { RecentFiles } from "./recent-files"
import { ParentFolderCard, ParentFolderRow } from "./parent-folder-entry"
import { RenameDialog } from "./rename-dialog"
import { ShareDialog } from "./share-dialog"
import { SortControl } from "./sort-control"
import { SelectionToolbar } from "./selection-toolbar"
import { UploadDialog } from "./upload-dialog"
import { NewFolderDialog } from "./new-folder-dialog"
import { useFileManager } from "./use-file-manager"
import { getBreadcrumbs } from "./file-utils"

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

export function FilesPageContent() {
  const manager = useFileManager()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 80,
        tolerance: 6,
      },
    })
  )

  const breadcrumbs = getBreadcrumbs(manager.files, manager.currentFolderId)

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null

    if (!overId || activeId === overId) return

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
      manager.moveSelected(targetFolderId)
      return
    }

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
    onExport: manager.exportItem,
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
             <div>
              <h1 className="text-xl font-semibold">
                <button
                  className="hover:text-foreground"
                  onClick={() => manager.setCurrentFolderId(null)}
                >
                  파일
                </button>
              </h1>
              <p className="text-sm text-muted-foreground">
                산하기관 &gt; 춘천북부노인복지관 &gt; 파일
              </p>
            </div>
            {breadcrumbs.map((folder) => (
              <span key={folder.id} className="flex items-center gap-2">
                <span>{">"}</span>
                <button
                  className="font-medium text-foreground hover:underline"
                  onClick={() => manager.setCurrentFolderId(folder.id)}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
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
      </header>

      <main className="flex-1 overflow-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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

            <SelectionToolbar
              count={manager.selectedIds.length}
              onClear={manager.clearSelection}
              onCopy={manager.copySelected}
              onToggleStar={manager.toggleSelectedStar}
              onDelete={manager.deleteSelected}
              onExport={manager.exportSelected}
              onUpdatePermissions={manager.updateSelectedPermissions}
            />

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

            {manager.viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {manager.currentFolderId && !manager.searchQuery && (
                  <ParentFolderCard onOpen={manager.goToParentFolder} />
                )}
                {manager.visibleFiles.map((item) => (
                  <FileCard
                    key={item.id}
                    item={item}
                    selected={manager.selectedIds.includes(item.id)}
                    {...commonActions}
                  />
                ))}
              </div>
            ) : (
              <FileList
                items={manager.visibleFiles}
                selectedIds={manager.selectedIds}
                parentRow={
                  manager.currentFolderId && !manager.searchQuery ? (
                    <ParentFolderRow onOpen={manager.goToParentFolder} />
                  ) : null
                }
                {...commonActions}
              />
            )}
          </CurrentFolderDropArea>
        </DndContext>
      </main>

      <ShareDialog
        item={manager.shareTarget}
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
        onOpenChange={manager.setUploadOpen}
        onUpload={manager.uploadFiles}
      />
      <NewFolderDialog
        open={manager.newFolderOpen}
        onOpenChange={manager.setNewFolderOpen}
        onCreate={manager.createFolder}
      />
    </div>
  )
}
