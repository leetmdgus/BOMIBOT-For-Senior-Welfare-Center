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
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable"
import {
  CornerLeftUp,
  FolderOpen,
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
import { YearFilterControl } from "./year-filter-control"
import { SelectionToolbar } from "./selection-toolbar"
import { UploadDialog } from "./upload-dialog"
import { FilePreviewDialog } from "./file-preview-dialog"
import {
  ParentUpCard,
  ParentUpRow,
  WorkFolderCard,
  WorkFolderList,
} from "./work-folder-view"
import { useFileManager } from "./use-file-manager"
import type { FileItem } from "./file-types"
import { FILE_DRAG_MOVE_THRESHOLD_PX } from "./file-utils"
import {
  isMajorFolderId,
  isWorkFolderId,
  majorFolderKeyFromId,
  TASK_UNASSIGNED,
  UNASSIGNED_FOLDER_NAME,
  workFolderKeyFromId,
  type WorkFolder,
} from "@/lib/files/work-folders"
import { useAuth } from "@/components/auth/auth-provider"
import { Header } from "../common/header"

function CurrentFolderDropArea({ children }: { children: ReactNode }) {
  return <div className="p-6">{children}</div>
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
            다른 검색어나 연도로 다시 시도해 보세요.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">이 업무 폴더가 비어 있어요</p>
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

  // 3단계: 루트(대분류 폴더) → 대분류 안(중분류=업무 폴더) → 업무 안(파일)
  const inTask = manager.currentTaskFolderId !== null
  const inMajor = !inTask && manager.currentMajorKey !== null
  const atRoot = !inTask && !inMajor

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

  const goToRoot = () => {
    manager.setCurrentMajorKey(null)
    manager.setCurrentTaskFolderId(null)
    manager.setSelectedIds([])
  }

  const goUp = () => {
    if (inTask) manager.goToMajor()
    else goToRoot()
  }

  const openMajorFolder = (folder: WorkFolder) => manager.enterMajor(folder.key)
  const openWorkFolder = (folder: WorkFolder) => manager.enterTaskFolder(folder)

  // 브레드크럼: 대분류(사업명) → 중분류(업무) 2단계
  const currentFolderName =
    manager.currentWorkFolder?.name ??
    manager.taskOptions.find((t) => t.id === manager.currentTaskFolderId)?.name ??
    (manager.currentTaskFolderId === TASK_UNASSIGNED
      ? UNASSIGNED_FOLDER_NAME
      : "업무")
  const currentMajorName = manager.currentMajor?.name ?? "사업"

  const nowIso = new Date().toISOString()
  const crumb = (id: string, name: string): FileItem => ({
    id,
    name,
    type: "folder",
    parentId: null,
    createdAt: nowIso,
    modifiedAt: nowIso,
    permission: "private",
  })
  const breadcrumbs: FileItem[] = []
  if ((inMajor || inTask) && manager.currentMajor) {
    breadcrumbs.push(crumb(manager.currentMajor.id, manager.currentMajor.name))
  }
  if (inTask) {
    breadcrumbs.push(
      crumb(`workfolder:${manager.currentTaskFolderId}`, currentFolderName),
    )
  }

  const navigateToFolder = (folderId: string | null) => {
    if (folderId === null) {
      goToRoot()
      return
    }
    if (isMajorFolderId(folderId)) {
      manager.enterMajor(majorFolderKeyFromId(folderId))
      return
    }
    if (isWorkFolderId(folderId)) {
      manager.enterTaskFolderByKey(workFolderKeyFromId(folderId))
    }
  }

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

  // 공유 링크(?share=) 진입 → 해당 파일의 업무 폴더로 이동 후 선택/미리보기
  useEffect(() => {
    const shareId = searchParams.get("share")?.trim()
    if (!shareId || manager.files.length === 0) return
    if (shareLinkHandledRef.current === shareId) return

    const target = manager.files.find((file) => file.id === shareId)
    if (!target) return

    shareLinkHandledRef.current = shareId

    const taskKey = target.taskId?.trim() ? target.taskId : TASK_UNASSIGNED
    manager.enterTaskFolderByKey(taskKey)

    if (target.type === "folder") {
      manager.setSelectedIds([])
      return
    }

    manager.setSelectedIds([target.id])
    if (target.permission === "public") {
      manager.setPreviewTarget(target)
    }
  }, [
    searchParams,
    manager.files,
    manager.setCurrentTaskFolderId,
    manager.setSelectedIds,
    manager.setPreviewTarget,
  ])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
    setDragOrderIds(visibleIds)
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!dragOrderIds) return
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId || overId.startsWith("folder:") || overId === activeId) return
    const oldIndex = dragOrderIds.indexOf(activeId)
    const newIndex = dragOrderIds.indexOf(overId)
    if (oldIndex < 0 || newIndex < 0) return
    setDragOrderIds(arrayMove(dragOrderIds, oldIndex, newIndex))
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
    setDragOrderIds(null)
  }

  // 평면 모델: 업무 폴더 안에서 "파일 순서 변경"만 처리 (폴더 위치는 고정)
  const handleDragEnd = (event: DragEndEvent) => {
    const finalOrder = dragOrderIds
    setActiveDragId(null)
    setDragOrderIds(null)

    if (!event.over) return
    const distance = Math.hypot(event.delta.x, event.delta.y)
    if (distance < FILE_DRAG_MOVE_THRESHOLD_PX) return

    if (finalOrder && finalOrder.length > 0) {
      manager.setCurrentFolderOrder(finalOrder)
    }
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
          <div className="flex min-w-0 items-center gap-1.5">
            {!atRoot ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2 text-muted-foreground"
                onClick={goUp}
                title="상위 폴더로"
              >
                <CornerLeftUp className="size-4" />
                상위 폴더
              </Button>
            ) : null}
            <FilesBreadcrumb trail={breadcrumbs} onNavigate={navigateToFolder} />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button className="gap-2" onClick={() => manager.setUploadOpen(true)}>
              <Upload className="size-4" />
              파일 업로드
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
              {atRoot
                ? "업로드 시 담당 업무 폴더로 분류됩니다"
                : `「${currentFolderName}」 업무 폴더에 업로드됩니다`}
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
                    placeholder={
                      atRoot
                        ? "사업(대분류) 검색..."
                        : inMajor
                          ? "프로그램(업무) 검색..."
                          : "파일 검색..."
                    }
                    value={manager.searchQuery}
                    onChange={(event) => manager.setSearchQuery(event.target.value)}
                    className="w-64 pl-9"
                  />
                </div>
                {atRoot ? (
                  <YearFilterControl
                    value={manager.yearFilter}
                    yearOptions={manager.yearOptions}
                    onChange={manager.setYearFilter}
                  />
                ) : inTask ? (
                  <SortControl value={manager.sortKey} onChange={manager.setSortKey} />
                ) : null}
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

            {inMajor && (
              <p className="mb-4 text-sm text-muted-foreground">
                사업 「{currentMajorName}」 · 프로그램 {manager.workFolders.length}개
              </p>
            )}
            {inTask && (
              <p className="mb-4 text-sm text-muted-foreground">
                업무 「{currentFolderName}」 · {manager.visibleFiles.length}개 파일
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

            {atRoot ? (
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

                {manager.majorFolders.length === 0 ? (
                  <EmptyState
                    searching={
                      Boolean(manager.searchQuery.trim()) || manager.yearFilter !== null
                    }
                    onUpload={() => manager.setUploadOpen(true)}
                  />
                ) : manager.viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {manager.majorFolders.map((folder) => (
                      <WorkFolderCard
                        key={folder.id}
                        folder={folder}
                        onOpen={openMajorFolder}
                      />
                    ))}
                  </div>
                ) : (
                  <WorkFolderList folders={manager.majorFolders} onOpen={openMajorFolder} />
                )}
              </>
            ) : inMajor ? (
              manager.workFolders.length === 0 ? (
                <>
                  {manager.viewMode === "grid" ? (
                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      <ParentUpCard onUp={goToRoot} />
                    </div>
                  ) : null}
                  <EmptyState
                    searching={Boolean(manager.searchQuery.trim())}
                    onUpload={() => manager.setUploadOpen(true)}
                  />
                </>
              ) : manager.viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <ParentUpCard onUp={goToRoot} />
                  {manager.workFolders.map((folder) => (
                    <WorkFolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={openWorkFolder}
                    />
                  ))}
                </div>
              ) : (
                <WorkFolderList folders={manager.workFolders} onOpen={openWorkFolder} />
              )
            ) : orderedVisibleFiles.length === 0 ? (
              <>
                {manager.viewMode === "grid" ? (
                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    <ParentUpCard onUp={goToRoot} />
                  </div>
                ) : null}
                <EmptyState
                  searching={Boolean(manager.searchQuery.trim())}
                  onUpload={() => manager.setUploadOpen(true)}
                />
              </>
            ) : manager.viewMode === "grid" ? (
              <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <ParentUpCard onUp={goToRoot} />
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
                  parentRow={<ParentUpRow onUp={goToRoot} />}
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
        defaultTaskId={
          manager.currentTaskFolderId &&
          manager.currentTaskFolderId !== TASK_UNASSIGNED
            ? manager.currentTaskFolderId
            : undefined
        }
        initialFiles={pendingUploadFiles}
        onOpenChange={(open) => {
          manager.setUploadOpen(open)
          if (!open) setPendingUploadFiles([])
        }}
        onUpload={manager.uploadFiles}
      />
      <FilePreviewDialog
        item={manager.previewTarget}
        onOpenChange={(open) => !open && manager.setPreviewTarget(null)}
      />
    </div>
  )
}
