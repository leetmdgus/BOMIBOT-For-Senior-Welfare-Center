import type { HwpxFrontendDocument } from "@/lib/hwpx/frontend-render-types"

export type DocumentAnalysisResult = {
  path: string
  filename: string
  kind: string
  supported: boolean
  summary: string
  previewHtml: string | null
  frontendJson: HwpxFrontendDocument | null
  plainText: string
  stats: {
    sizeBytes?: number
    paragraphCount?: number
    textLength?: number
  }
  documentTitle?: string
}
