"use client"

import { useEffect, useRef, useState } from "react"
import { FileUp, Loader2, Plus, X } from "lucide-react"

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
import { uploadEbookPdf } from "@/services/ebooks.service"
import {
  REGISTERABLE_CATEGORIES,
  type Category,
} from "@/services/ebooks.types"

type EbookUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 등록 성공 시 호출 — 목록 새로고침 */
  onRegistered: () => void
}

const MAX_PDF_BYTES = 50 * 1024 * 1024 // 50MB

/** PDF 한 권을 신규 도서로 등록하는 다이얼로그. */
export function EbookUploadDialog({
  open,
  onOpenChange,
  onRegistered,
}: EbookUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [team, setTeam] = useState("")
  const [category, setCategory] = useState<Category>(REGISTERABLE_CATEGORIES[0])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitle("")
      setTeam("")
      setCategory(REGISTERABLE_CATEGORIES[0])
      setFile(null)
      setError(null)
      setSaving(false)
    }
  }, [open])

  const pickFile = (next: File | null) => {
    if (!next) {
      setFile(null)
      return
    }
    if (!next.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 등록할 수 있습니다.")
      return
    }
    if (next.size > MAX_PDF_BYTES) {
      setError("파일이 너무 큽니다. 50MB 이하의 PDF를 등록해 주세요.")
      return
    }
    setError(null)
    setFile(next)
    if (!title.trim()) {
      setTitle(next.name.replace(/\.pdf$/i, ""))
    }
  }

  const submit = async () => {
    if (!file || !title.trim()) return
    if (!uploadEbookPdf) {
      setError("백엔드(API) 연결이 필요합니다. 목업 모드에서는 등록할 수 없습니다.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await uploadEbookPdf({
        title: title.trim(),
        team: team.trim(),
        category,
        file,
      })
      onRegistered()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "도서 등록에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" />
            신규 도서 등록 (PDF)
          </DialogTitle>
          <DialogDescription>
            PDF 파일을 한 권의 전자책으로 등록합니다. 등록 후 목록에서 바로 열람할
            수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">PDF 파일</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                pickFile(event.target.files?.[0] ?? null)
                event.target.value = ""
              }}
            />
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="truncate text-sm">{file.name}</span>
                <button
                  type="button"
                  aria-label="파일 제거"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setFile(null)}
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="size-4" />
                PDF 선택
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">도서명</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="도서명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">발행부서</Label>
              <Input
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                placeholder="예: 사업팀"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">분류</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as Category)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {REGISTERABLE_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            disabled={saving || !file || !title.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                등록 중…
              </>
            ) : (
              <>
                <Plus className="size-4" />
                등록
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
