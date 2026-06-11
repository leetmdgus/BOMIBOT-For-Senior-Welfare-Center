"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TaskOption } from "@common/types/file-types"

type SaveToFilesDialogProps = {
  open: boolean
  taskOptions: TaskOption[]
  defaultFileName: string
  onOpenChange: (open: boolean) => void
  /** 완성 문서를 /files에 저장 (업무 카테고리로 링크) */
  onSave: (params: { taskId: string; fileName: string }) => Promise<void>
}

/** 완성 문서를 업무 카테고리(칸반 업무)에 링크해 /files에 저장하는 다이얼로그. */
export function SaveToFilesDialog({
  open,
  taskOptions,
  defaultFileName,
  onOpenChange,
  onSave,
}: SaveToFilesDialogProps) {
  const [taskId, setTaskId] = useState("")
  const [fileName, setFileName] = useState(defaultFileName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTaskId(taskOptions[0]?.id ?? "")
      setFileName(defaultFileName)
      setError(null)
      setSaving(false)
    }
  }, [open, defaultFileName, taskOptions])

  const submit = async () => {
    if (!taskId || !fileName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ taskId, fileName: fileName.trim() })
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "저장에 실패했습니다.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="size-4 text-primary" />
            완성 문서 저장
          </DialogTitle>
          <DialogDescription>
            업무 카테고리를 선택하면 해당 업무에 링크되어 「파일관리」(/files)에
            저장됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">업무 카테고리</Label>
            {taskOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                칸반에 등록된 업무(카드)가 없습니다. 보드에 카드를 만든 뒤 저장해
                주세요.
              </p>
            ) : (
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="업무 선택" />
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">파일명</Label>
            <Input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="문서명.hwpx"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              saving ||
              !taskId ||
              !fileName.trim() ||
              taskOptions.length === 0
            }
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                저장 중…
              </>
            ) : (
              <>
                <Save className="size-4" />
                저장
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
