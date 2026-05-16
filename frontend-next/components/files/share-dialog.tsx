"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { FileItem, Permission } from "./file-types"

interface ShareDialogProps {
  item: FileItem | null
  onOpenChange: (open: boolean) => void
  onSave: (itemId: string, permission: Permission) => void
}

export function ShareDialog({ item, onOpenChange, onSave }: ShareDialogProps) {
  const [permission, setPermission] = useState<Permission>("private")

  useEffect(() => {
    setPermission(item?.permission ?? "private")
  }, [item])

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>공유 / 접근권한 설정</DialogTitle>
        </DialogHeader>

        <Select value={permission} onValueChange={(value) => setPermission(value as Permission)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">나만 보기</SelectItem>
            <SelectItem value="team">팀 접근</SelectItem>
            <SelectItem value="public">링크 접근</SelectItem>
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={() => {
              if (!item) return
              onSave(item.id, permission)
              onOpenChange(false)
            }}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
