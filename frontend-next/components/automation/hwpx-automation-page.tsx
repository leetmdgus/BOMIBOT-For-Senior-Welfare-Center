"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Download,
  FolderUp,
  Loader2,
  ScanSearch,
  Zap,
} from "lucide-react"

import { Sidebar } from "@/components/common/sidebar"
import { Header } from "@/components/common/header"
import { DocumentPreviewPanel } from "@/components/automation/document-preview-panel"
import { EvidenceDocumentTree } from "@/components/automation/evidence-document-tree"
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
import { HwpxEditorPanel } from "@/components/automation/hwpx-editor-panel"
import { cn } from "@/lib/utils"
import {
  analyzeEvidenceDocument,
  downloadHwpxDocument,
} from "@/services/automation.service"

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

  const treeStats = useMemo(
    () => (treeRoot ? countEvidenceTree(treeRoot) : null),
    [treeRoot],
  )

  const previewData = editedDoc

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
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">미리보기</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {selectedPath ?? "파일을 선택하세요"}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <DocumentPreviewPanel
                  analysis={analysis}
                  hwpxPreview={previewData}
                  sourceFile={selectedFile}
                  loading={loading}
                />
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
    </div>
  )
}
