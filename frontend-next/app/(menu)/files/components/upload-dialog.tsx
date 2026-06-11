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

import { TASK_FILTER_NONE } from "./task-filter-control"
import type { TaskOption } from "@common/types/file-types"

interface UploadDialogProps {
  open: boolean
  taskOptions: TaskOption[]
  defaultTaskId?: string | null
  /** OS에서 끌어다 놓아 미리 채워진 파일들 */
  initialFiles?: File[]
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[], taskId: string) => void | Promise<void>
}

function resolveDefaultTaskId(
  taskOptions: TaskOption[],
  defaultTaskId?: string | null,
): string {
  if (
    defaultTaskId &&
    defaultTaskId !== TASK_FILTER_NONE &&
    taskOptions.some((t) => t.id === defaultTaskId)
  ) {
    return defaultTaskId
  }
  return taskOptions[0]?.id ?? ""
}

export function UploadDialog({
  open,
  taskOptions,
  defaultTaskId,
  initialFiles,
  onOpenChange,
  onUpload,
}: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taskId, setTaskId] = useState(() =>
    resolveDefaultTaskId(taskOptions, defaultTaskId),
  )

  useEffect(() => {
    if (open) {
      setTaskId(resolveDefaultTaskId(taskOptions, defaultTaskId))
      setError(null)
      setFiles(initialFiles ?? [])
    }
  }, [open, defaultTaskId, taskOptions, initialFiles])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>파일 업로드</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block text-sm font-medium">담당 업무</label>
          {taskOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              칸반에 등록된 업무(카드)가 없습니다. 보드에 카드를 만든 뒤 업로드해
              주세요.
            </p>
          ) : (
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
          )}

          <label className="block text-sm font-medium">파일</label>
          <input
            type="file"
            multiple
            className="w-full rounded-md border p-2 text-sm"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />

          {files.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-md border bg-muted/30 p-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isUploading}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            disabled={
              isUploading ||
              files.length === 0 ||
              !taskId ||
              taskOptions.length === 0
            }
            onClick={() => {
              void (async () => {
                setIsUploading(true)
                setError(null)
                try {
                  await onUpload(files, taskId)
                  setFiles([])
                  onOpenChange(false)
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "파일 업로드에 실패했습니다.",
                  )
                } finally {
                  setIsUploading(false)
                }
              })()
            }}
          >
            {isUploading ? "업로드 중…" : "업로드"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
