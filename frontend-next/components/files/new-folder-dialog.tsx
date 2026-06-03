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

interface NewFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void | Promise<void>
}

export function NewFolderDialog({ open, onOpenChange, onCreate }: NewFolderDialogProps) {
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName("")
      setSubmitting(false)
    }
  }, [open])

  const submit = async () => {
    const nextName = name.trim()
    if (!nextName || submitting) return
    setSubmitting(true)
    try {
      await onCreate(nextName)
      setName("")
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

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
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              void submit()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button disabled={!name.trim() || submitting} onClick={() => void submit()}>
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
