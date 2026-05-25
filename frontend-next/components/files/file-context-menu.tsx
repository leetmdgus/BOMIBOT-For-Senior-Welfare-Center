"use client"

import type { ReactNode } from "react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Copy, Download, Pencil, Share2, Star, Trash2 } from "lucide-react"

import type { FileItem } from "./file-types"

interface FileContextMenuProps {
  item: FileItem
  children: ReactNode
  onCopy: (item: FileItem) => void
  onRename: (item: FileItem) => void
  onShare: (item: FileItem) => void
  onToggleStar: (item: FileItem) => void
  onDelete: (item: FileItem) => void
  onExport: (item: FileItem) => void
  onDownload: (item: FileItem) => void
}

export function FileContextMenu({
  item,
  children,
  onCopy,
  onRename,
  onShare,
  onToggleStar,
  onDelete,
  onExport,
  onDownload,
}: FileContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() =>
            item.type === "folder" ? onExport(item) : onDownload(item)
          }
        >
          <Download className="mr-2 size-4" />
          {item.type === "folder" ? "폴더 export (ZIP)" : "다운로드"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopy(item)}>
          <Copy className="mr-2 size-4" />
          복사
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onToggleStar(item)}>
          <Star className="mr-2 size-4" />
          즐겨찾기
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onShare(item)}>
          <Share2 className="mr-2 size-4" />
          공유 / 권한
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRename(item)}>
          <Pencil className="mr-2 size-4" />
          이름 수정
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="mr-2 size-4" />
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
