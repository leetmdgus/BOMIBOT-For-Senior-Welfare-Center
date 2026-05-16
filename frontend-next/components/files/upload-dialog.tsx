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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { TaskOption } from "./file-types"

interface UploadDialogProps {
  open: boolean
  taskOptions: TaskOption[]
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[], taskId: string) => void
}

export function UploadDialog({ open, taskOptions, onOpenChange, onUpload }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [taskId, setTaskId] = useState(taskOptions[0]?.id ?? "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>파일 업로드</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block text-sm font-medium">담당 업무</label>
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger>
              <SelectValue placeholder="담당 업무 선택" />
            </SelectTrigger>
            <SelectContent>
              {taskOptions.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="block text-sm font-medium">파일</label>
          <input
            type="file"
            multiple
            className="w-full rounded-md border p-2 text-sm"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            disabled={files.length === 0 || !taskId}
            onClick={() => {
              onUpload(files, taskId)
              setFiles([])
              onOpenChange(false)
            }}
          >
            업로드
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
