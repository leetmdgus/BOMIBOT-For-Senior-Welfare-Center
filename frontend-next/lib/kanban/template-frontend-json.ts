/**
 * frontendJson(HWPX 편집 구조) 헬퍼.
 *
 * - 셀/문단 텍스트를 불변 업데이트하여, 백엔드 export_hwpx_preserving 의 writeback 규칙
 *   (run_index 기반 text_run 반영)과 호환되는 형태로 만든다.
 * - 빈 칸은 파서가 빈 run 을 버리므로 text_run 이 없다 → run_index=0 으로 주입한다
 *   (Phase 0 스파이크에서 실제 양식 빈 칸 채움이 검증됨).
 */

import type {
  HwpxFrontendJson,
  HwpxParagraph,
  HwpxTableRun,
  HwpxTextRun,
} from "@/services/document-templates.types"

/** 1 inch = 7200 HWPUNIT, 96px/inch */
export function hwpUnitToPx(unit: number | null | undefined): number | undefined {
  if (typeof unit !== "number" || !Number.isFinite(unit) || unit <= 0) return undefined
  return Math.round((unit / 7200) * 96)
}

/** 셀 위치 — frontendJson 내 인덱스 경로. */
export interface CellPath {
  paragraphIndex: number
  runIndex: number
  rowIndex: number
  cellIndex: number
}

function setFirstTextRun(paragraphs: HwpxParagraph[], text: string): void {
  for (const p of paragraphs) {
    for (const run of p.runs) {
      if (run.type === "text_run") {
        ;(run as HwpxTextRun).text = text
        return
      }
    }
  }
  // text_run 이 없으면(빈 칸) 주입 — writeback 이 run_index 로 기존 <run> 을 찾는다
  if (paragraphs.length === 0) {
    paragraphs.push({ type: "paragraph", runs: [], text: "" })
  }
  paragraphs[0].runs.push({ type: "text_run", run_index: 0, text })
}

/** 표 셀 텍스트를 불변 업데이트한 새 frontendJson 반환. */
export function setCellText(
  frontendJson: HwpxFrontendJson,
  path: CellPath,
  text: string,
): HwpxFrontendJson {
  const next = structuredClone(frontendJson)
  const para = next.document.paragraphs[path.paragraphIndex]
  const run = para?.runs[path.runIndex]
  if (!run || run.type !== "table") return frontendJson
  const cell = (run as HwpxTableRun).rows[path.rowIndex]?.cells[path.cellIndex]
  if (!cell) return frontendJson
  cell.text = text
  setFirstTextRun(cell.paragraphs, text)
  return next
}

/** 최상위 문단 텍스트를 불변 업데이트한 새 frontendJson 반환. */
export function setParagraphText(
  frontendJson: HwpxFrontendJson,
  paragraphIndex: number,
  text: string,
): HwpxFrontendJson {
  const next = structuredClone(frontendJson)
  const para = next.document.paragraphs[paragraphIndex]
  if (!para) return frontendJson
  para.text = text
  setFirstTextRun([para], text)
  return next
}

/** 문단이 편집 가능한 단순 텍스트 문단인지(표/이미지 없이 텍스트만). */
export function isPlainTextParagraph(para: HwpxParagraph): boolean {
  return para.runs.every((r) => r.type === "text_run")
}
