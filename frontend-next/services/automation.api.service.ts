import {
  apiFetchBlobWithMeta,
  apiUploadFormData,
  resolveApiPath,
} from "@/lib/api-client"
import { triggerBlobDownload } from "@/lib/files/download-blob"
import type { DocumentAnalysisResult } from "@/lib/automation/document-analysis-types"
import type { HwpxFrontendDocument, HwpxParseResponse } from "@/lib/hwpx/frontend-render-types"

const analyzePath = resolveApiPath(
  "/api/automation/documents/analyze",
  "/api/v1/automation/documents/analyze",
)

const parsePath = resolveApiPath(
  "/api/automation/hwpx/parse",
  "/api/v1/automation/hwpx/parse",
)

const renderSvgPath = resolveApiPath(
  "/api/automation/hwpx/render-svg",
  "/api/v1/automation/hwpx/render-svg",
)

const aiFillPath = resolveApiPath(
  "/api/automation/hwpx/ai-fill",
  "/api/v1/automation/hwpx/ai-fill",
)

const exportPath = resolveApiPath(
  "/api/automation/hwpx/export",
  "/api/v1/automation/hwpx/export",
)

export async function analyzeEvidenceDocument(
  file: File,
  relativePath: string,
): Promise<DocumentAnalysisResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("relative_path", relativePath)

  return apiUploadFormData<DocumentAnalysisResult>(analyzePath, formData)
}

export async function parseHwpxDocument(file: File): Promise<HwpxParseResponse> {
  const formData = new FormData()
  formData.append("file", file)

  return apiUploadFormData<HwpxParseResponse>(parsePath, formData)
}

export type HwpxSvgFontMode = "" | "style" | "subset" | "full"

export type HwpxSvgRenderResult = {
  format: string
  sourceFilename: string
  pageCount: number
  /** 페이지 순서대로 정렬된 SVG 문자열 (rhwp 정확 렌더) */
  pages: string[]
}

export type AiFillResult = {
  /** 빈칸ID("p.r.row.col") → 채울 값 */
  fills: Record<string, string>
  warnings: string[]
  /** 양식에서 발견한 빈 칸 총 개수 */
  fieldCount?: number
}

/**
 * 참고 문서(들)로 현재 HWPX 양식의 빈 칸을 AI(Gemini)가 채운 제안을 받는다.
 * 제안만 반환하며 저장하지 않는다(프론트에서 검토 후 적용).
 */
export async function aiFillForm(
  frontendJson: HwpxFrontendDocument,
  references: File[],
): Promise<AiFillResult> {
  const formData = new FormData()
  formData.append("frontendJson", JSON.stringify(frontendJson))
  for (const file of references) {
    formData.append("references", file)
  }
  return apiUploadFormData<AiFillResult>(aiFillPath, formData)
}

/**
 * rhwp(Rust 렌더러)로 HWPX를 페이지별 SVG로 정확 렌더링한다.
 * frontendJson을 주면 원본에 writeback한 결과(=편집 반영)를 렌더한다.
 */
export async function renderHwpxSvg(
  file: File,
  frontendJson?: HwpxFrontendDocument | null,
  fontMode: HwpxSvgFontMode = "",
): Promise<HwpxSvgRenderResult> {
  const formData = new FormData()
  formData.append("file", file)
  if (frontendJson) {
    formData.append("frontendJson", JSON.stringify(frontendJson))
  }
  if (fontMode) {
    formData.append("font_mode", fontMode)
  }

  return apiUploadFormData<HwpxSvgRenderResult>(renderSvgPath, formData)
}

export async function exportHwpxDocument(
  sourceFile: File,
  frontendJson: HwpxFrontendDocument,
  downloadFilename?: string,
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData()
  formData.append("file", sourceFile)
  formData.append("frontendJson", JSON.stringify(frontendJson))
  if (downloadFilename) {
    formData.append("download_filename", downloadFilename)
  }

  const result = await apiFetchBlobWithMeta(exportPath, {
    method: "POST",
    body: formData,
  })

  return {
    blob: result.blob,
    filename: result.filename ?? downloadFilename ?? sourceFile.name,
  }
}

export async function downloadHwpxDocument(
  sourceFile: File,
  frontendJson: HwpxFrontendDocument,
  downloadFilename?: string,
): Promise<void> {
  const { blob, filename } = await exportHwpxDocument(
    sourceFile,
    frontendJson,
    downloadFilename,
  )
  triggerBlobDownload(blob, filename)
}
