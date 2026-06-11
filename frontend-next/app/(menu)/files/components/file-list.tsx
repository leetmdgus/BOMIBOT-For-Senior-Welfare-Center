"use client"

import type { ReactNode } from "react"
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

import { FileActionsMenu } from "./file-actions-menu"
import { FileContextMenu } from "./file-context-menu"
import { fileColors, fileIcons } from "./file-icons"
import type { FileItem } from "@common/types/file-types"

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
  onDownload: (item: FileItem) => void
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
  onDownload,
}: FileListProps & { item: FileItem; selected: boolean }) {
  const Icon = fileIcons[item.type]
  const sortable = useSortable({ id: item.id })
  const droppable = useDroppable({
    id: `folder:${item.id}`,
    disabled: item.type !== "folder",
  })

  const setRefs = (node: HTMLTableRowElement | null) => {
    sortable.setNodeRef(node)
    if (item.type === "folder") droppable.setNodeRef(node)
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
      <tr
        ref={setRefs}
        {...sortable.attributes}
        className={cn(
          "border-b hover:bg-muted/50",
          selected && "bg-muted/70",
          droppable.isOver && "bg-primary/10"
        )}
        style={{
          opacity: sortable.isDragging ? 0.4 : 1,
          transform: CSS.Transform.toString(sortable.transform),
          transition: sortable.transition,
        }}
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
        <td className="w-10 p-4">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(item.id, true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`${item.name} 선택`}
          />
        </td>
        <td className="w-9 p-2">
          <button
            type="button"
            className="flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={`${item.name} 드래그하여 이동`}
            {...sortable.listeners}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </button>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <Icon className={cn("size-5", fileColors[item.type])} />
            <span className="font-medium">{item.name}</span>
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
            <th className="w-9 p-2"></th>
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
