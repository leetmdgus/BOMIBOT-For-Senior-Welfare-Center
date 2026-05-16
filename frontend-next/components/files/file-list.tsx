"use client"

import type { ReactNode } from "react"
import { MoreHorizontal, Star } from "lucide-react"
import { useDraggable, useDroppable } from "@dnd-kit/core"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { FileActionsMenu } from "./file-actions-menu"
import { FileContextMenu } from "./file-context-menu"
import { fileColors, fileIcons } from "./file-icons"
import type { FileItem } from "./file-types"

interface FileListProps {
  items: FileItem[]
  selectedIds: string[]
  parentRow?: ReactNode
  onOpen: (item: FileItem) => void
  onSelect: (id: string, additive?: boolean) => void
  onCopy: (item: FileItem) => void
  onRename: (item: FileItem) => void
  onShare: (item: FileItem) => void
  onToggleStar: (item: FileItem) => void
  onDelete: (item: FileItem) => void
  onExport: (item: FileItem) => void
}

function FileRow({
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
}: FileListProps & { item: FileItem; selected: boolean }) {
  const Icon = fileIcons[item.type]
  const draggable = useDraggable({ id: item.id })
  const droppable = useDroppable({
    id: `folder:${item.id}`,
    disabled: item.type !== "folder",
  })

  const setRefs = (node: HTMLTableRowElement | null) => {
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
    >
      <tr
        ref={setRefs}
        {...draggable.listeners}
        {...draggable.attributes}
        className={cn(
          "cursor-grab border-b hover:bg-muted/50 active:cursor-grabbing",
          selected && "bg-muted/70",
          droppable.isOver && "bg-primary/10"
        )}
        style={{ opacity: draggable.isDragging ? 0.55 : 1 }}
        onDoubleClick={() => onOpen(item)}
        onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            onSelect(item.id, true)
          }
        }}
      >
        <td className="w-10 p-4">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(item.id, true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`${item.name} 선택`}
          />
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <Icon className={cn("size-5", fileColors[item.type])} />
            <button className="font-medium hover:underline" onClick={() => onOpen(item)}>
              {item.name}
            </button>
            {item.starred && <Star className="size-4 fill-amber-400 text-amber-400" />}
            {item.shared && (
              <Badge variant="secondary" className="text-[10px]">
                공유됨
              </Badge>
            )}
          </div>
        </td>
        <td className="p-4 text-sm text-muted-foreground">{item.taskName || "-"}</td>
        <td className="p-4 text-sm text-muted-foreground">{item.modifiedAt.slice(0, 10)}</td>
        <td className="p-4 text-sm text-muted-foreground">{item.size || "-"}</td>
        <td className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
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
            />
          </DropdownMenu>
        </td>
      </tr>
    </FileContextMenu>
  )
}

export function FileList(props: FileListProps) {
  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="w-10 p-4"></th>
            <th className="p-4">이름</th>
            <th className="p-4">담당 업무</th>
            <th className="p-4">수정일</th>
            <th className="p-4">크기</th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody>
          {props.parentRow}
          {props.items.map((item) => (
            <FileRow
              key={item.id}
              {...props}
              item={item}
              selected={props.selectedIds.includes(item.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
