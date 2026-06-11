"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import {
  buildFileShareUrl,
  copyTextToClipboard,
} from "@/lib/files/share-link"

import type { FileItem, Permission } from "@common/types/file-types"

interface ShareDialogProps {
  item: FileItem | null
  regionId?: string | null
  onOpenChange: (open: boolean) => void
  onSave: (itemId: string, permission: Permission) => void
}

export function ShareDialog({
  item,
  regionId,
  onOpenChange,
  onSave,
}: ShareDialogProps) {
  const [permission, setPermission] = useState<Permission>("private")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setPermission(item?.permission ?? "private")
    setCopied(false)
  }, [item])

  const shareUrl = useMemo(() => {
    if (!item || permission !== "public") return ""
    return buildFileShareUrl(item.id, { regionId })
  }, [item, permission, regionId])

  const handleCopyLink = async () => {
    if (!shareUrl) return
    const ok = await copyTextToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
      return
    }
    window.prompt("아래 링크를 복사하세요.", shareUrl)
  }

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>공유 / 접근권한 설정</DialogTitle>
        </DialogHeader>

        {item ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.name}</span>
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="file-permission">접근 권한</Label>
          <Select
            value={permission}
            onValueChange={(value) => {
              setPermission(value as Permission)
              setCopied(false)
            }}
          >
            <SelectTrigger id="file-permission">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">나만 보기</SelectItem>
              <SelectItem value="team">팀 접근</SelectItem>
              <SelectItem value="public">링크 접근</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {permission === "public" && shareUrl ? (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="size-4 shrink-0 text-primary" />
              공유 링크
            </div>
            <p className="text-xs text-muted-foreground">
              링크를 받은 사용자는 로그인 후 파일 관리에서 이 항목으로 이동할 수
              있습니다. 저장 후에도 동일한 링크를 사용할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-9 flex-1 font-mono text-xs"
                onFocus={(event) => event.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => void handleCopyLink()}
              >
                {copied ? (
                  <>
                    <Check className="size-4 text-primary" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    링크 복사
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

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
