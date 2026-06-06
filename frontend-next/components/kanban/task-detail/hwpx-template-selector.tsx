"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, FileText, Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
  deleteDocumentTemplate,
  listDocumentTemplates,
  uploadDocumentTemplate,
} from "@/services/document-templates.api.service"
import type {
  DocumentTemplateKind,
  DocumentTemplateMeta,
} from "@/services/document-templates.types"

const DEFAULT_VALUE = "default"

type HwpxTemplateSelectorProps = {
  /** 양식 종류 — 업로드 태그·목록 필터 */
  kind: DocumentTemplateKind
  /** 선택된 양식 id. null 이면 기본(기존) 양식 */
  selectedTemplateId: string | null
  onSelect: (templateId: string | null) => void
  /** 기본 양식 표시 문구 — 계획/평가별 라벨 */
  defaultLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * 계획서/평가서 HWPX 양식 선택기.
 * 기본값은 기존 양식이며, 업로드한 양식을 골라 다운로드 시 베이스로 쓸 수 있다.
 * 임의 양식은 라벨 매칭으로 best-effort 채워진다(슬롯 자동탐지는 추후).
 */
export function HwpxTemplateSelector({
  kind,
  selectedTemplateId,
  onSelect,
  defaultLabel = "기본 양식",
  disabled = false,
  className,
}: HwpxTemplateSelectorProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<DocumentTemplateMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setTemplates(await listDocumentTemplates())
    } catch (error) {
      toast({
        title: "양식 목록을 불러오지 못했습니다",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 해당 종류 + 태그 없는 범용 양식만 노출 (다른 종류 태그는 숨김)
  const visibleTemplates = templates.filter((t) => !t.kind || t.kind === kind)
  const selected = templates.find((t) => t.id === selectedTemplateId)
  const triggerLabel = selectedTemplateId
    ? selected?.name ?? "선택한 양식"
    : defaultLabel

  const handleFilePicked = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setUploading(true)
      try {
        const meta = await uploadDocumentTemplate(file, undefined, kind)
        await refresh()
        onSelect(meta.id)
        toast({
          title: "양식 업로드 완료",
          description: `${meta.name} · 표 ${meta.stats.tableCount}개 · 빈칸 ${meta.stats.emptyCellCount}개`,
        })
      } catch (error) {
        toast({
          title: "업로드 실패",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        })
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [kind, onSelect, refresh, toast],
  )

  const handleDelete = useCallback(
    async (templateId: string) => {
      try {
        await deleteDocumentTemplate(templateId)
        setTemplates((prev) => prev.filter((t) => t.id !== templateId))
        if (selectedTemplateId === templateId) onSelect(null)
      } catch (error) {
        toast({
          title: "삭제 실패",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        })
      }
    },
    [onSelect, selectedTemplateId, toast],
  )

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".hwpx"
        className="hidden"
        onChange={(e) => void handleFilePicked(e.target.files?.[0])}
      />

      <DropdownMenu onOpenChange={(open) => open && void refresh()}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            className="max-w-55"
          >
            {uploading ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <FileText className="mr-1.5 size-4" />
            )}
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="ml-1 size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>양식 선택</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={selectedTemplateId ?? DEFAULT_VALUE}
            onValueChange={(value) =>
              onSelect(value === DEFAULT_VALUE ? null : value)
            }
          >
            <DropdownMenuRadioItem value={DEFAULT_VALUE}>
              {defaultLabel}
              <span className="ml-1 text-xs text-muted-foreground">(기존)</span>
            </DropdownMenuRadioItem>

            {loading ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                불러오는 중…
              </div>
            ) : (
              visibleTemplates.map((tpl) => (
                <div key={tpl.id} className="flex items-center">
                  <DropdownMenuRadioItem value={tpl.id} className="flex-1">
                    <span className="truncate">{tpl.name}</span>
                  </DropdownMenuRadioItem>
                  <button
                    type="button"
                    className="mr-1 rounded p-1 text-muted-foreground hover:text-red-500"
                    aria-label="양식 삭제"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleDelete(tpl.id)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              fileInputRef.current?.click()
            }}
          >
            <Upload className="mr-1.5 size-4" />
            새 양식 업로드(.hwpx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default HwpxTemplateSelector
