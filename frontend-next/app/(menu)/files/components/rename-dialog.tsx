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
import { Input } from "@/components/ui/input"

import type { FileItem } from "@common/types/file-types"

interface RenameDialogProps {
  item: FileItem | null
  onOpenChange: (open: boolean) => void
  onSave: (itemId: string, name: string) => void
}

export function RenameDialog({ item, onOpenChange, onSave }: RenameDialogProps) {
  const [name, setName] = useState("")

  useEffect(() => {
    setName(item?.name ?? "")
  }, [item])

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이름 수정</DialogTitle>
        </DialogHeader>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={() => {
              if (!item) return
              onSave(item.id, name)
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
