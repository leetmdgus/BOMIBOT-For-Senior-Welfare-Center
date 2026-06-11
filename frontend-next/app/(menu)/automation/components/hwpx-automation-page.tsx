"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Download,
  Eye,
  FolderUp,
  Loader2,
  Pencil,
  Save,
  ScanSearch,
  Sparkles,
  Zap,
} from "lucide-react"

import { Sidebar } from "@common/layouts/sidebar"
import { Header } from "@common/layouts/header"
import { AutomationFillDialog } from "@menu/automation/components/automation-fill-dialog"
import { SaveToFilesDialog } from "@menu/automation/components/save-to-files-dialog"
import { DocumentPreviewPanel } from "@menu/automation/components/document-preview-panel"
import { EvidenceDocumentTree } from "@menu/automation/components/evidence-document-tree"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DocumentAnalysisResult } from "@/lib/automation/document-analysis-types"
import {
  buildEvidenceTreeFromFiles,
  countEvidenceTree,
  type EvidenceTreeNode,
} from "@/lib/automation/document-tree"
import type { HwpxFrontendDocument } from "@/lib/hwpx/frontend-render-types"
import {
  clearAutomationDraft,
  loadAutomationDraft,
  saveAutomationDraft,
} from "@/lib/automation/automation-draft"
import { HwpxEditorPanel } from "@menu/automation/components/hwpx-editor-panel"
import { HwpxWysiwygEditor } from "@common/components/hwpx/HwpxWysiwygEditor"
import type { TaskOption } from "@common/types/file-types"
import { cn } from "@/lib/utils"
import {
  analyzeEvidenceDocument,
  downloadHwpxDocument,
  exportHwpxDocument,
} from "@/services/automation.service"
import {
  getFileManagerState,
  uploadFilesToServer,
} from "@/services/files.service"

/** base64 → File (analyze가 돌려준 변환 HWPX를 작업 파일로 복원) */
function base64ToFile(base64: string, filename: string, type: string): File {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type })
}

export function HwpxAutomationPage() {
  const [treeRoot, setTreeRoot] = useState<EvidenceTreeNode | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null)
  const [editedDoc, setEditedDoc] = useState<HwpxFrontendDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fillOpen, setFillOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  // 중앙 패널 모드: 문서 위 직접수정(edit) ↔ rhwp 정확 미리보기(preview)
  const [centerMode, setCenterMode] = useState<"edit" | "preview">("edit")
  // 임시저장 복원 완료 전 자동저장이 빈 상태를 덮어쓰지 않도록 가드
  const draftReady = useRef(false)

  const treeStats = useMemo(
    () => (treeRoot ? countEvidenceTree(treeRoot) : null),
    [treeRoot],
  )

  const previewData = editedDoc
  // 문서 위 직접수정(WYSIWYG) 가능 여부 — HWPX 파싱 결과(frontend JSON)가 있을 때만
  const wysiwygAvailable = analysis?.kind === "hwpx" && Boolean(editedDoc)

  // 업무 카테고리(칸반 업무) 목록 로드 — 저장 다이얼로그에서 사용
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const state = await getFileManagerState()
        if (!cancelled) setTaskOptions(state.taskOptions ?? [])
      } catch {
        /* 업무 목록 실패는 저장 시 안내 */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 임시저장 복원 — F5/탭 이동 후에도 작업 중 문서 유지
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const draft = await loadAutomationDraft()
      if (cancelled) {
        return
      }
      if (draft?.editedDoc) {
        setEditedDoc(draft.editedDoc as HwpxFrontendDocument)
        setAnalysis((draft.analysis as DocumentAnalysisResult) ?? null)
        if (draft.fileBlob) {
          setSelectedFile(
            new File([draft.fileBlob], draft.fileName || "document.hwpx"),
          )
        }
        setSelectedPath(`${draft.fileName || "임시저장 문서"} (임시저장 복원)`)
        setNotice("임시저장된 작업 문서를 복원했습니다.")
      }
      draftReady.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 작업 중 문서 자동 임시저장 (디바운스)
  useEffect(() => {
    if (!draftReady.current) return
    if (!editedDoc) return
    const timer = window.setTimeout(() => {
      void saveAutomationDraft({
        fileName: selectedFile?.name ?? "document.hwpx",
        fileBlob: selectedFile ?? null,
        editedDoc,
        analysis,
        savedAt: Date.now(),
      })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [editedDoc, selectedFile, analysis])

  const analyzeFile = useCallback(async (node: EvidenceTreeNode) => {
    if (node.type !== "file" || !node.file) return

    setLoading(true)
    setError(null)
    setSelectedPath(node.path)
    setSelectedFile(node.file)

    try {
      const result = await analyzeEvidenceDocument(node.file, node.path)
      setAnalysis(result)
      setEditedDoc(result.frontendJson ?? null)
      // .hwp는 rhwp가 HWPX로 변환 → 이후 렌더/내보내기/저장은 변환본(HWPX)을 사용
      if (result.workingFile) {
        setSelectedFile(
          base64ToFile(
            result.workingFile.contentBase64,
            result.workingFile.filename,
            "application/hwp+zip",
          ),
        )
      }
    } catch (err) {
      setAnalysis(null)
      setEditedDoc(null)
      setError(err instanceof Error ? err.message : "문서 분석에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFolderUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      event.target.value = ""
      if (!fileList?.length) return

      const files = Array.from(fileList)
      const root = buildEvidenceTreeFromFiles(files)
      setTreeRoot(root)
      setSelectedPath(null)
      setSelectedFile(null)
      setAnalysis(null)
      setEditedDoc(null)
      setError(null)
      setBatchProgress(null)
    },
    [],
  )

  const handleAnalyzeAll = useCallback(async () => {
    if (!treeRoot) return

    const collectFiles = (node: EvidenceTreeNode): EvidenceTreeNode[] => {
      if (node.type === "file" && node.file) return [node]
      return (node.children ?? []).flatMap(collectFiles)
    }

    const files = collectFiles(treeRoot)
    if (files.length === 0) return

    setBatchProgress(`0 / ${files.length}`)
    setError(null)

    for (let index = 0; index < files.length; index += 1) {
      const node = files[index]
      setBatchProgress(`${index + 1} / ${files.length} · ${node.name}`)
      await analyzeFile(node)
    }

    setBatchProgress(`완료 · ${files.length}개 문서 분석`)
  }, [analyzeFile, treeRoot])

  const handleExport = useCallback(async () => {
    if (!selectedFile || !previewData || analysis?.kind !== "hwpx") return

    setExporting(true)
    setError(null)

    try {
      const downloadName = selectedFile.name.replace(/\.hwpx$/i, "_edited.hwpx")
      await downloadHwpxDocument(selectedFile, previewData, downloadName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "HWPX보내기에 실패했습니다.")
    } finally {
      setExporting(false)
    }
  }, [analysis?.kind, previewData, selectedFile])

  const handleApplyFill = useCallback(
    (next: HwpxFrontendDocument, appliedCount: number) => {
      setEditedDoc(next)
      setNotice(`AI 자동 채움으로 ${appliedCount}개 칸을 채웠습니다. 편집기에서 검토하세요.`)
    },
    [],
  )

  const handleSaveToFiles = useCallback(
    async ({ taskId, fileName }: { taskId: string; fileName: string }) => {
      if (!selectedFile || !previewData) {
        throw new Error("저장할 문서가 없습니다.")
      }
      if (!uploadFilesToServer) {
        throw new Error("파일 업로드 API를 사용할 수 없습니다.")
      }
      const name = fileName.toLowerCase().endsWith(".hwpx")
        ? fileName
        : `${fileName}.hwpx`
      const { blob } = await exportHwpxDocument(selectedFile, previewData, name)
      const file = new File([blob], name, { type: "application/hwp+zip" })
      await uploadFilesToServer({ files: [file], taskId })
      await clearAutomationDraft()
      setNotice(`완성 문서를 파일관리(/files)에 저장했습니다: ${name}`)
    },
    [previewData, selectedFile],
  )

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
                증빙문서 폴더 업로드 · 트리 · 분석
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                증빙문서 폴더 전체를 올리면 트리 구조로 보여 주고, 파일을
                선택해 HWPX·Office 문서를 분석합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor="evidence-folder-upload"
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent",
                )}
              >
                <FolderUp className="size-4" />
                폴더 업로드
              </Label>
              <Input
                id="evidence-folder-upload"
                type="file"
                className="hidden"
                multiple
                onChange={handleFolderUpload}
                {...({ webkitdirectory: "" } as Record<string, string>)}
              />

              <Button
                type="button"
                variant="outline"
                disabled={!treeRoot || loading}
                onClick={() => void handleAnalyzeAll()}
              >
                <ScanSearch className="size-4" />
                전체 순차 분석
              </Button>

              {previewData ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFillOpen(true)}
                >
                  <Sparkles className="size-4" />
                  자동화
                </Button>
              ) : null}

              {previewData && selectedFile && analysis?.kind === "hwpx" ? (
                <Button type="button" onClick={() => setSaveOpen(true)}>
                  <Save className="size-4" />
                  완성 문서 저장
                </Button>
              ) : null}

              {analysis?.kind === "hwpx" ? (
                <Button
                  type="button"
                  disabled={!selectedFile || !previewData || exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  HWPX 다운로드
                </Button>
              ) : null}
            </div>
          </div>

          {treeStats ? (
            <p className="text-sm text-muted-foreground">
              폴더 {treeStats.folders}개 · 문서 {treeStats.files}개
              {batchProgress ? ` · ${batchProgress}` : null}
            </p>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-foreground">
              <span>{notice}</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setNotice(null)}
              >
                닫기
              </button>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">증빙문서 트리</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  폴더 구조 그대로 표시
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <EvidenceDocumentTree
                  root={treeRoot}
                  selectedPath={selectedPath}
                  onSelect={(node) => void analyzeFile(node)}
                />
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {wysiwygAvailable && centerMode === "edit"
                      ? "문서 직접 수정"
                      : "미리보기"}
                  </h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {selectedPath ?? "파일을 선택하세요"}
                  </p>
                </div>
                {wysiwygAvailable ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-md border p-0.5">
                    <button
                      type="button"
                      onClick={() => setCenterMode("edit")}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                        centerMode === "edit"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Pencil className="size-3.5" />
                      직접 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setCenterMode("preview")}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                        centerMode === "preview"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Eye className="size-3.5" />
                      정확 미리보기
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {wysiwygAvailable && centerMode === "edit" && editedDoc ? (
                  <div className="p-3">
                    <HwpxWysiwygEditor doc={editedDoc} onChange={setEditedDoc} />
                  </div>
                ) : (
                  <DocumentPreviewPanel
                    analysis={analysis}
                    hwpxPreview={previewData}
                    sourceFile={selectedFile}
                    loading={loading}
                  />
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">분석 결과</h2>
                {analysis ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analysis.summary}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    선택한 문서의 요약·텍스트
                  </p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {!analysis && !loading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    트리에서 문서를 클릭하면 분석합니다.
                  </p>
                ) : null}

                {analysis?.plainText ? (
                  <div className="mb-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      추출 텍스트
                    </Label>
                    <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                      {analysis.plainText.slice(0, 4000)}
                      {analysis.plainText.length > 4000 ? "\n…" : ""}
                    </pre>
                  </div>
                ) : null}

                {editedDoc ? (
                  <HwpxEditorPanel doc={editedDoc} onChange={setEditedDoc} />
                ) : analysis && analysis.kind === "hwpx" ? (
                  <p className="text-sm text-muted-foreground">
                    HWPX 구조를 불러오지 못했습니다.
                  </p>
                ) : analysis ? (
                  <p className="text-sm text-muted-foreground">
                    HWPX가 아닌 문서는 미리보기 탭에서 확인하세요.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </main>

      <AutomationFillDialog
        open={fillOpen}
        doc={previewData}
        onOpenChange={setFillOpen}
        onApply={handleApplyFill}
      />

      <SaveToFilesDialog
        open={saveOpen}
        taskOptions={taskOptions}
        defaultFileName={(selectedFile?.name ?? "문서").replace(/\.hwpx$/i, "")}
        onOpenChange={setSaveOpen}
        onSave={handleSaveToFiles}
      />
    </div>
  )
}
