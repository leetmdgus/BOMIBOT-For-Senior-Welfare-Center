"use client"

import {
  Copy,
  Download,
  Pencil,
  Share2,
  Star,
  Trash2,
} from "lucide-react"

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import type { FileItem } from "./file-types"

interface FileActionsMenuProps {
  item: FileItem
  onCopy: (item: FileItem) => void
  onRename: (item: FileItem) => void
  onShare: (item: FileItem) => void
  onToggleStar: (item: FileItem) => void
  onDelete: (item: FileItem) => void
  onExport: (item: FileItem) => void
}

export function FileActionsMenu({
  item,
  onCopy,
  onRename,
  onShare,
  onToggleStar,
  onDelete,
  onExport,
}: FileActionsMenuProps) {
  return (
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onExport(item)}>
        <Download className="mr-2 size-4" />
        {item.type === "folder" ? "폴더 export" : "다운로드"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onCopy(item)}>
        <Copy className="mr-2 size-4" />
        복사
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onToggleStar(item)}>
        <Star className="mr-2 size-4" />
        즐겨찾기
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onShare(item)}>
        <Share2 className="mr-2 size-4" />
        공유 / 권한
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onRename(item)}>
        <Pencil className="mr-2 size-4" />
        이름 수정
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
        <Trash2 className="mr-2 size-4" />
        삭제
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
