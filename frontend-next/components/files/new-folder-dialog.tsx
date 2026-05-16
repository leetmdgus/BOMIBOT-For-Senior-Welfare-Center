"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface NewFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}

export function NewFolderDialog({ open, onOpenChange, onCreate }: NewFolderDialogProps) {
  const [name, setName] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 폴더</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="폴더명을 입력하세요"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              onCreate(name)
              setName("")
              onOpenChange(false)
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onCreate(name)
              setName("")
              onOpenChange(false)
            }}
          >
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
