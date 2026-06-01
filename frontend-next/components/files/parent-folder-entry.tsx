"use client"

import { CornerUpLeft } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"

import { cn } from "@/lib/utils"

interface ParentFolderEntryProps {
  onOpen: () => void
}

export function ParentFolderCard({ onOpen }: ParentFolderEntryProps) {
  const droppable = useDroppable({ id: "folder:parent" })

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        "cursor-pointer rounded-xl border border-dashed bg-card p-4 transition-all hover:shadow-md",
        droppable.isOver && "ring-2 ring-primary/50"
      )}
      onClick={onOpen}
    >
      <div className="mb-3 flex h-20 items-center justify-center rounded-lg bg-muted/50">
        <CornerUpLeft className="size-10 text-muted-foreground" />
      </div>
      <p className="truncate text-sm font-medium">..</p>
      <p className="mt-1 text-xs text-muted-foreground">이전 폴더</p>
    </div>
  )
}

export function ParentFolderRow({ onOpen }: ParentFolderEntryProps) {
  const droppable = useDroppable({ id: "folder:parent" })

  return (
    <tr
      ref={droppable.setNodeRef}
      className={cn(
        "cursor-pointer border-b hover:bg-muted/50",
        droppable.isOver && "bg-primary/10"
      )}
      onClick={onOpen}
    >
      <td className="p-4"></td>
      <td className="p-2"></td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <CornerUpLeft className="size-5 text-muted-foreground" />
          <span className="font-medium">..</span>
        </div>
      </td>
      <td className="p-4 text-sm text-muted-foreground">이전 폴더</td>
      <td className="p-4"></td>
      <td className="p-4"></td>
      <td className="p-4"></td>
    </tr>
  )
}
