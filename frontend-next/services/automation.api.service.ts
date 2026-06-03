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
