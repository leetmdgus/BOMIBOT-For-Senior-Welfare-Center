"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Sparkles, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  fillCellsByIds,
  type HwpxFrontendDocument,
} from "@/lib/hwpx/frontend-render-types"
import { aiFillForm } from "@/services/automation.service"

type AutomationFillDialogProps = {
  open: boolean
  /** 채울 대상 양식(편집 중인 문서) */
  doc: HwpxFrontendDocument | null
  onOpenChange: (open: boolean) => void
  /** 채움 적용 결과를 편집 상태에 반영 */
  onApply: (next: HwpxFrontendDocument, appliedCount: number) => void
}

type RunResult = {
  appliedCount: number
  fieldCount: number
  warnings: string[]
}

/** 참고 문서를 선택해 AI(Gemini)로 현재 양식 빈 칸을 채우는 다이얼로그. */
export function AutomationFillDialog({
  open,
  doc,
  onOpenChange,
  onApply,
}: AutomationFillDialogProps) {
  const [references, setReferences] = useState<File[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setReferences([])
      setError(null)
      setResult(null)
      setRunning(false)
    }
  }, [open])

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    setReferences((prev) => [...prev, ...Array.from(files)])
  }

  const removeFile = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index))
  }

  const run = async () => {
    if (!doc || references.length === 0) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const { fills, warnings, fieldCount } = await aiFillForm(doc, references)
      const { doc: next, appliedCount } = fillCellsByIds(doc, fills)
      if (appliedCount > 0) {
        onApply(next, appliedCount)
      }
      setResult({
        appliedCount,
        fieldCount: fieldCount ?? 0,
        warnings: warnings ?? [],
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI 자동 채움에 실패했습니다.",
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI 자동 채움
          </DialogTitle>
          <DialogDescription>
            참고 문서를 올리면 현재 양식의 빈 칸을 AI가 채웁니다. 추측 없이 근거가
            있는 칸만 채우며, 적용 후 편집기에서 검토·수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => inputRef.current?.click()}
            disabled={running}
          >
            <Upload className="size-4" />
            참고 문서 선택 (여러 개 가능)
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".hwpx,.docx,.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt"
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = ""
            }}
          />

          {references.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-md border bg-muted/30 p-2">
              {references.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFile(index)}
                    aria-label="제거"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              선택한 참고 문서가 없습니다.
            </p>
          )}

          {error ? (
            <p className="rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">
                {result.appliedCount > 0
                  ? `빈 칸 ${result.fieldCount}개 중 ${result.appliedCount}개를 채웠습니다.`
                  : "채울 수 있는 값을 찾지 못했습니다."}
              </p>
              {result.warnings.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            {result ? "닫기" : "취소"}
          </Button>
          <Button
            onClick={() => void run()}
            disabled={running || !doc || references.length === 0}
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                자동화 중…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                자동화 실행
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
