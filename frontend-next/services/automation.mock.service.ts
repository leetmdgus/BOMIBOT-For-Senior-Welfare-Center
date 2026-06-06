import type { DocumentAnalysisResult } from "@/lib/automation/document-analysis-types"
import type { HwpxParseResponse } from "@/lib/hwpx/frontend-render-types"
import type { HwpxSvgRenderResult } from "./automation.api.service"

export async function analyzeEvidenceDocument(
  _file: File,
  _relativePath: string,
): Promise<DocumentAnalysisResult> {
  throw new Error(
    "문서 분석은 FastAPI 백엔드 연결이 필요합니다. NEXT_PUBLIC_USE_MOCK_API=false 로 설정해 주세요.",
  )
}

export async function parseHwpxDocument(_file: File): Promise<HwpxParseResponse> {
  throw new Error(
    "문서자동화는 FastAPI 백엔드 연결이 필요합니다. NEXT_PUBLIC_USE_MOCK_API=false 로 설정해 주세요.",
  )
}

export async function downloadHwpxDocument(): Promise<void> {
  throw new Error(
    "문서자동화 HWPX 내보내기는 FastAPI 백엔드 연결이 필요합니다.",
  )
}

export async function renderHwpxSvg(): Promise<HwpxSvgRenderResult> {
  // 백엔드(rhwp) 없는 mock 모드 → 빈 결과 반환 시 호출부가 근사 렌더러로 폴백
  return { format: "hwpx", sourceFilename: "", pageCount: 0, pages: [] }
}
