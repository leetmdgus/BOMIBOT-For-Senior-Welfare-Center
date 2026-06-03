"use client"

import { GripVertical, MoreHorizontal, Star } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { shouldOpenFileOnPrimaryClick } from "@/lib/files/open-file-item"

import { fileColors, fileIcons } from "./file-icons"
import type { FileItem } from "./file-types"
import { FileActionsMenu } from "./file-actions-menu"
import { FileContextMenu } from "./file-context-menu"

interface FileCardProps {
  item: FileItem
  selected: boolean
  onOpen: (item: FileItem) => void
  onSelect: (id: string, additive?: boolean) => void
  onCopy: (item: FileItem) => void
  onRename: (item: FileItem) => void
  onShare: (item: FileItem) => void
  onToggleStar: (item: FileItem) => void
  onDelete: (item: FileItem) => void
  onExport: (item: FileItem) => void
  onDownload: (item: FileItem) => void
}

export function FileCard({
  item,
  selected,
  onOpen,
  onSelect,
  onCopy,
  onRename,
  onShare,
  onToggleStar,
  onDelete,
  onExport,
  onDownload,
}: FileCardProps) {
  const Icon = fileIcons[item.type]
  const sortable = useSortable({ id: item.id })
  const droppable = useDroppable({
    id: `folder:${item.id}`,
    disabled: item.type !== "folder",
  })

  const setRefs = (node: HTMLDivElement | null) => {
    sortable.setNodeRef(node)
    if (item.type === "folder") droppable.setNodeRef(node)
  }

  const style: React.CSSProperties = {
    opacity: sortable.isDragging ? 0.4 : 1,
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  return (
    <FileContextMenu
      item={item}
      onOpen={onOpen}
      onCopy={onCopy}
      onRename={onRename}
      onShare={onShare}
      onToggleStar={onToggleStar}
      onDelete={onDelete}
      onExport={onExport}
      onDownload={onDownload}
    >
      <div
        ref={setRefs}
        {...sortable.attributes}
        className={cn(
          "group relative rounded-xl border bg-card p-4 transition-all hover:shadow-md",
          selected && "ring-2 ring-primary",
          droppable.isOver && "ring-2 ring-primary/50"
        )}
        style={style}
        onDoubleClick={() => onOpen(item)}
        onClick={(event) => {
          // 폴더는 단일 클릭으로 진입 (파일 탐색기 UX)
          if (item.type === "folder" && !(event.ctrlKey || event.metaKey || event.shiftKey)) {
            void onOpen(item)
            return
          }
          if (shouldOpenFileOnPrimaryClick(item, event)) {
            void onOpen(item)
            return
          }
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            onSelect(item.id, true)
            return
          }
          onSelect(item.id, false)
        }}
      >
        <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(item.id, true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`${item.name} 선택`}
          />
        </div>

        <button
          type="button"
          className="absolute bottom-2 right-2 flex size-7 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted active:cursor-grabbing group-hover:opacity-100"
          aria-label={`${item.name} 드래그하여 이동`}
          {...sortable.listeners}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {item.starred && <Star className="size-4 fill-amber-400 text-amber-400" />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <FileActionsMenu
              item={item}
              onOpen={onOpen}
              onCopy={onCopy}
              onRename={onRename}
              onShare={onShare}
              onToggleStar={onToggleStar}
              onDelete={onDelete}
              onExport={onExport}
              onDownload={onDownload}
            />
          </DropdownMenu>
        </div>

        <div className="mb-3 flex h-20 items-center justify-center rounded-lg bg-muted/50">
          <Icon className={cn("size-10", fileColors[item.type])} />
        </div>

        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {item.modifiedAt.slice(0, 10)}
          </span>
          {item.type !== "folder" && item.hasContent && (
            <Badge variant="outline" className="text-[10px]">
              실제 파일
            </Badge>
          )}
          {item.shared && (
            <Badge variant="secondary" className="text-[10px]">
              공유됨
            </Badge>
          )}
        </div>
        {item.taskName && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            업무: {item.taskName}
          </p>
        )}
      </div>
    </FileContextMenu>
  )
}
