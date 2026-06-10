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
  /**
   * .hwp(바이너리)를 rhwp로 HWPX 변환한 경우의 작업 파일.
   * 프론트는 이후 렌더/내보내기/저장에 원본(.hwp) 대신 이 HWPX를 사용한다.
   */
  workingFile?: {
    filename: string
    contentBase64: string
  } | null
}
