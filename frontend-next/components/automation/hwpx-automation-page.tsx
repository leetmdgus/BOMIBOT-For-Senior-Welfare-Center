"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Download,
  FileUp,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { HwpxRenderer } from "@/components/hwpx/HwpxRenderer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  applyTextFieldEdits,
  collectEditableTextFields,
  type EditableTextField,
  type HwpxFrontendDocument,
} from "@/lib/hwpx/frontend-render-types"
import { cn } from "@/lib/utils"
import {
  downloadHwpxDocument,
  parseHwpxDocument,
} from "@/services/automation.service"

export function HwpxAutomationPage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [frontendJson, setFrontendJson] = useState<HwpxFrontendDocument | null>(
    null,
  )
  const [documentTitle, setDocumentTitle] = useState("")
  const [textFields, setTextFields] = useState<EditableTextField[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const previewData = useMemo(() => {
    if (!frontendJson) return null
    return applyTextFieldEdits(frontendJson, textFields)
  }, [frontendJson, textFields])

  const filteredFields = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return textFields
    return textFields.filter(
      (field) =>
        field.label.toLowerCase().includes(query) ||
        field.value.toLowerCase().includes(query),
    )
  }, [search, textFields])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) return

      setLoading(true)
      setError(null)

      try {
        const result = await parseHwpxDocument(file)
        setSourceFile(file)
        setFrontendJson(result.frontendJson)
        setDocumentTitle(result.documentTitle)
        setTextFields(collectEditableTextFields(result.frontendJson))
      } catch (err) {
        setSourceFile(null)
        setFrontendJson(null)
        setTextFields([])
        setError(err instanceof Error ? err.message : "HWPX 파싱에 실패했습니다.")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const handleFieldChange = useCallback((id: string, value: string) => {
    setTextFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, value } : field)),
    )
  }, [])

  const handleResetFields = useCallback(() => {
    if (!frontendJson) return
    setTextFields(collectEditableTextFields(frontendJson))
  }, [frontendJson])

  const handleExport = useCallback(async () => {
    if (!sourceFile || !previewData) return

    setExporting(true)
    setError(null)

    try {
      const downloadName = sourceFile.name.replace(/\.hwpx$/i, "_edited.hwpx")
      await downloadHwpxDocument(sourceFile, previewData, downloadName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "HWPX 내보내기에 실패했습니다.")
    } finally {
      setExporting(false)
    }
  }, [previewData, sourceFile])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <Header />

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Zap className="size-5" />
                <span className="text-sm font-medium">문서자동화</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                HWPX 문서 미리보기 · 편집 · 내보내기
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                한글 HWPX 파일을 업로드하면 웹에서 양식을 확인하고 텍스트를
                수정한 뒤, 다시 HWPX로 내려받을 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor="hwpx-upload"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  loading
                    ? "pointer-events-none opacity-60"
                    : "hover:bg-accent",
                )}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                HWPX 업로드
              </Label>
              <Input
                id="hwpx-upload"
                type="file"
                accept=".hwpx,application/hwp+zip"
                className="hidden"
                disabled={loading}
                onChange={handleFileChange}
              />

              <Button
                type="button"
                variant="outline"
                disabled={!frontendJson}
                onClick={handleResetFields}
              >
                <RefreshCw className="size-4" />
                편집 초기화
              </Button>

              <Button
                type="button"
                disabled={!sourceFile || !previewData || exporting}
                onClick={handleExport}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                HWPX 다운로드
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">텍스트 편집</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sourceFile
                    ? `${documentTitle || sourceFile.name} · ${textFields.length}개 필드`
                    : "HWPX 파일을 업로드하면 편집 가능한 텍스트 목록이 표시됩니다."}
                </p>
                {frontendJson ? (
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="텍스트 검색…"
                    className="mt-3"
                  />
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {!frontendJson ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    아직 불러온 문서가 없습니다.
                  </p>
                ) : filteredFields.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    편집 가능한 텍스트가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id} className="text-xs text-muted-foreground">
                          {field.label}
                        </Label>
                        <Textarea
                          id={field.id}
                          value={field.value}
                          rows={Math.min(6, Math.max(2, field.value.split("\n").length))}
                          onChange={(event) =>
                            handleFieldChange(field.id, event.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="min-h-0 overflow-hidden rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">문서 미리보기</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  week09 HwpxRenderer 기반 A4 페이지 렌더링
                </p>
              </div>

              <div className="h-[calc(100vh-220px)] min-h-[480px] overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    HWPX 문서를 분석하는 중…
                  </div>
                ) : previewData ? (
                  <HwpxRenderer data={previewData} />
                ) : (
                  <p className="py-24 text-center text-sm text-muted-foreground">
                    업로드한 HWPX 문서가 여기에 표시됩니다.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
