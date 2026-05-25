"use client"

import { MoreHorizontal, Star } from "lucide-react"
import { useDraggable, useDroppable } from "@dnd-kit/core"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

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
  const draggable = useDraggable({ id: item.id })
  const droppable = useDroppable({
    id: `folder:${item.id}`,
    disabled: item.type !== "folder",
  })

  const setRefs = (node: HTMLDivElement | null) => {
    draggable.setNodeRef(node)
    if (item.type === "folder") droppable.setNodeRef(node)
  }

  return (
    <FileContextMenu
      item={item}
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
        {...draggable.listeners}
        {...draggable.attributes}
        className={cn(
          "group relative cursor-grab rounded-xl border bg-card p-4 transition-all hover:shadow-md active:cursor-grabbing",
          selected && "ring-2 ring-primary",
          droppable.isOver && "ring-2 ring-primary/50"
        )}
        style={{
          opacity: draggable.isDragging ? 0.55 : 1,
        }}
        onDoubleClick={() => onOpen(item)}
        onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            onSelect(item.id, true)
          }
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

        <div
          className="mb-3 flex h-20 items-center justify-center rounded-lg bg-muted/50"
          onClick={() => onOpen(item)}
        >
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
