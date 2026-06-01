"use client"

import { Copy, Download, Share2, Star, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Permission } from "./file-types"

interface SelectionToolbarProps {
  count: number
  onClear: () => void
  onCopy: () => void
  onToggleStar: () => void
  onDelete: () => void
  onExport: () => void
  onUpdatePermissions: (permission: Permission) => void
}

export function SelectionToolbar({
  count,
  onClear,
  onCopy,
  onToggleStar,
  onDelete,
  onExport,
  onUpdatePermissions,
}: SelectionToolbarProps) {
  if (count === 0) return null

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border bg-primary/5 p-3">
      <div className="text-sm font-medium">{count}개 선택됨</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
          <Download className="size-4" />
          선택 항목 ZIP export
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onCopy}>
          <Copy className="size-4" />
          복사
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onToggleStar}>
          <Star className="size-4" />
          즐겨찾기
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="size-4" />
              권한 변경
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onUpdatePermissions("private")}>
              나만 보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdatePermissions("team")}>
              팀 접근
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdatePermissions("public")}>
              링크 접근
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="destructive" size="sm" className="gap-2" onClick={onDelete}>
          <Trash2 className="size-4" />
          삭제
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
