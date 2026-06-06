"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Download,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { TemplateDocumentEditor } from "@/components/kanban/task-detail/template-doc/template-document-editor"
import {
  deleteDocumentTemplate,
  exportFilledTemplate,
  getDocumentTemplate,
  listDocumentTemplates,
  uploadDocumentTemplate,
} from "@/services/document-templates.api.service"
import type {
  DocumentTemplateDetail,
  DocumentTemplateMeta,
  HwpxFrontendJson,
} from "@/services/document-templates.types"

type TemplateWorkspaceProps = {
  readOnly?: boolean
}

export function TemplateWorkspace({ readOnly = false }: TemplateWorkspaceProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [detail, setDetail] = useState<DocumentTemplateDetail | null>(null)
  const [frontendJson, setFrontendJson] = useState<HwpxFrontendJson | null>(null)
  const [busy, setBusy] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  const loadTemplate = useCallback(
    async (templateId: string) => {
      setBusy(true)
      try {
        const loaded = await getDocumentTemplate(templateId)
        setDetail(loaded)
        setFrontendJson(loaded.frontendJson)
      } catch (error) {
        toast({
          title: "양식을 불러오지 못했습니다",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        })
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )

  const handleFilePicked = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setBusy(true)
      try {
        const meta = await uploadDocumentTemplate(file)
        toast({
          title: "양식 업로드 완료",
          description: `${meta.name} · 표 ${meta.stats.tableCount}개 · 빈칸 ${meta.stats.emptyCellCount}개`,
        })
        await loadTemplate(meta.id)
      } catch (error) {
        toast({
          title: "업로드 실패",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        })
      } finally {
        setBusy(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [loadTemplate, toast],
  )

  const handleExport = useCallback(async () => {
    if (!detail || !frontendJson) return
    setBusy(true)
    try {
      await exportFilledTemplate(detail.id, frontendJson, detail.sourceFilename)
    } catch (error) {
      toast({
        title: "내려받기 실패",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }, [detail, frontendJson, toast])

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".hwpx"
        className="hidden"
        onChange={(e) => handleFilePicked(e.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || readOnly}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          양식 업로드
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => setLibraryOpen(true)}
        >
          <FolderOpen className="mr-1.5 h-4 w-4" />
          이전 양식 불러오기
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !detail}
          onClick={handleExport}
        >
          <Download className="mr-1.5 h-4 w-4" />
          HWPX 내려받기
        </Button>
        {detail ? (
          <span className="ml-1 truncate text-sm text-muted-foreground">
            {detail.name}
          </span>
        ) : null}
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {frontendJson ? (
        <TemplateDocumentEditor
          frontendJson={frontendJson}
          readOnly={readOnly}
          onChange={setFrontendJson}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-muted-foreground">
          한글 양식(.hwpx)을 업로드하거나 「이전 양식 불러오기」로 선택하세요.
          <br />
          업로드한 양식이 그대로 표시되며, 빈 칸을 채워 HWPX로 내려받을 수 있습니다.
        </div>
      )}

      <TemplateLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={(id) => {
          setLibraryOpen(false)
          void loadTemplate(id)
        }}
      />
    </div>
  )
}

function TemplateLibraryDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (templateId: string) => void
}) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<DocumentTemplateMeta[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setTemplates(await listDocumentTemplates())
    } catch (error) {
      toast({
        title: "목록을 불러오지 못했습니다",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  const handleDelete = useCallback(
    async (templateId: string) => {
      try {
        await deleteDocumentTemplate(templateId)
        setTemplates((prev) => prev.filter((t) => t.id !== templateId))
      } catch (error) {
        toast({
          title: "삭제 실패",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>이전 양식 불러오기</DialogTitle>
          <DialogDescription>
            이전에 업로드한 한글 양식을 선택해 다시 사용합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              저장된 양식이 없습니다. 먼저 양식을 업로드하세요.
            </div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 hover:bg-neutral-50"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelect(tpl.id)}
                >
                  <div className="truncate text-sm font-medium">{tpl.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    표 {tpl.stats.tableCount}개 · 빈칸 {tpl.stats.emptyCellCount}개 ·{" "}
                    {tpl.createdAt.slice(0, 10)}
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-red-500"
                  onClick={() => handleDelete(tpl.id)}
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
