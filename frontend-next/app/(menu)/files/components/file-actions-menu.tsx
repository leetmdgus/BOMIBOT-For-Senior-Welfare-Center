"use client"

import {
  Copy,
  Download,
  ExternalLink,
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

import type { FileItem } from "@common/types/file-types"

interface FileActionsMenuProps {
  item: FileItem
  onOpen: (item: FileItem) => void
  onCopy: (item: FileItem) => void
  onRename: (item: FileItem) => void
  onShare: (item: FileItem) => void
  onToggleStar: (item: FileItem) => void
  onDelete: (item: FileItem) => void
  onExport: (item: FileItem) => void
  onDownload: (item: FileItem) => void
}

export function FileActionsMenu({
  item,
  onOpen,
  onCopy,
  onRename,
  onShare,
  onToggleStar,
  onDelete,
  onExport,
  onDownload,
}: FileActionsMenuProps) {
  return (
    <DropdownMenuContent align="end">
      {item.type !== "folder" && item.hasContent ? (
        <DropdownMenuItem onClick={() => void onOpen(item)}>
          <ExternalLink className="mr-2 size-4" />
          열기
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        onClick={() =>
          item.type === "folder" ? onExport(item) : onDownload(item)
        }
      >
        <Download className="mr-2 size-4" />
        {item.type === "folder" ? "폴더 export (ZIP)" : "다운로드"}
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
