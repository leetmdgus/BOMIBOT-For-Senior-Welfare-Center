import type {
  BusinessEvaluationData,
  BusinessPlanDocument,
  EvaluationFile,
} from "@/services/kanban.task-detail.types"
import { normalizeTaskId } from "@/lib/kanban/resolve-card-title"

export const FIXED_TEMPLATE_ID = "fixed-template"
/** 사업평가 함께보기 — 오른쪽 편집 내용 실시간 반영 */
export const FIXED_EVALUATION_LIVE_ID = "fixed-evaluation-live"
/** 사업계획 함께보기 — 오른쪽 편집 내용 실시간 반영 */
export const FIXED_PLAN_LIVE_ID = "fixed-plan-live"
/** 함께보기 목록에 주입하는 실시간 평가서 항목 */
export const EVALUATION_LIVE_REFERENCE_FILE: EvaluationFile = {
  id: FIXED_EVALUATION_LIVE_ID,
  name: "작성 중인 사업평가서",
  type: "평가서",
  source: "builtin",
}
/** 함께보기 목록에 주입하는 실시간 사업계획서 항목 */
export const PLAN_LIVE_REFERENCE_FILE: EvaluationFile = {
  id: FIXED_PLAN_LIVE_ID,
  name: "작성 중인 사업계획서",
  type: "계획서",
  source: "builtin",
}
/** 사회복지사업 단위사업계획서 HWPX 양식 (ex_사업계획.hwpx) */
export const FIXED_PLAN_TEMPLATE_ID = "fixed-plan-template"
/** HWPX 템플릿 A4 근사 미리보기 */
export const FIXED_PLAN_HWPX_PREVIEW_ID = "fixed-plan-hwpx-preview"
export const FIXED_EVAL_HWPX_PREVIEW_ID = "fixed-evaluation-hwpx-preview"
export const PLAN_HWPX_PREVIEW_FILE: EvaluationFile = {
  id: FIXED_PLAN_HWPX_PREVIEW_ID,
  name: "한글 양식 미리보기",
  type: "미리보기",
  source: "builtin",
}
export const EVAL_HWPX_PREVIEW_FILE: EvaluationFile = {
  id: FIXED_EVAL_HWPX_PREVIEW_ID,
  name: "한글 양식 미리보기",
  type: "미리보기",
  source: "builtin",
}
export const FIXED_PLAN_ID = "fixed-plan"

export const PLAN_HWPX_TEMPLATE_TITLE = "사회복지사업 단위사업계획서"

const FILE_TYPE_LABELS: Record<string, string> = {
  image: "이미지",
  pdf: "PDF",
  document: "문서",
  spreadsheet: "스프레드시트",
  video: "동영상",
  archive: "압축",
  etc: "기타",
}

/** 기본틀 + 저장된 사업계획서 + 업무 첨부 파일 목록 (id 중복 제거) */
export function mergeTaskReferenceDocuments(
  fixedFiles: EvaluationFile[],
  taskFiles: EvaluationFile[],
): EvaluationFile[] {
  const seen = new Set<string>()
  const merged: EvaluationFile[] = []

  for (const file of [...fixedFiles, ...taskFiles]) {
    if (seen.has(file.id)) continue
    seen.add(file.id)
    merged.push({
      ...file,
      source:
        file.source ??
        (fixedFiles.some((f) => f.id === file.id)
          ? ("builtin" as const)
          : ("file-manager" as const)),
    })
  }

  return merged
}

export function isSavedBusinessPlanDocument(file: EvaluationFile | null): boolean {
  if (!file) return false
  return file.id === FIXED_PLAN_ID || file.source === "saved-plan"
}

export function isPlanTemplateDocument(file: EvaluationFile | null): boolean {
  if (!file) return false
  return file.id === FIXED_PLAN_TEMPLATE_ID
}

export function isPlanHwpxPreviewDocument(file: EvaluationFile | null): boolean {
  if (!file) return false
  return file.id === FIXED_PLAN_HWPX_PREVIEW_ID
}

/** 사업계획 — 좌측 패널에 우측 편집기와 동일한 양식 미러 */
export function isPlanLivePreviewDocument(file: EvaluationFile | null): boolean {
  if (!file) return false
  return (
    file.id === FIXED_PLAN_LIVE_ID ||
    file.id === FIXED_PLAN_TEMPLATE_ID ||
    file.id === FIXED_PLAN_HWPX_PREVIEW_ID ||
    file.id === FIXED_PLAN_ID
  )
}

export function isEvaluationHwpxPreviewDocument(
  file: EvaluationFile | null,
): boolean {
  if (!file) return false
  return file.id === FIXED_EVAL_HWPX_PREVIEW_ID
}

export function isHwpxPreviewDocument(file: EvaluationFile | null): boolean {
  return isPlanHwpxPreviewDocument(file) || isEvaluationHwpxPreviewDocument(file)
}

export function isBuiltinTemplateDocument(file: EvaluationFile | null): boolean {
  if (!file) return false
  return file.id === FIXED_TEMPLATE_ID
}

/** 사업평가 — 좌측 패널에 현재 편집 중인 평가서를 실시간 표시 */
export function isEvaluationLivePreviewDocument(
  file: EvaluationFile | null,
  evaluation?: BusinessEvaluationData | null,
): boolean {
  if (!file || !evaluation) return false
  if (
    file.id === FIXED_EVALUATION_LIVE_ID ||
    file.id === FIXED_EVAL_HWPX_PREVIEW_ID ||
    file.id === FIXED_TEMPLATE_ID
  ) {
    return true
  }
  if (evaluation.hwpxFileId && file.id === evaluation.hwpxFileId) {
    return true
  }
  return false
}

export function isFileManagerDocument(file: EvaluationFile | null): boolean {
  if (!file) return false
  return file.source === "file-manager"
}

export function fileContentPath(fileId: string): string {
  const encoded = encodeURIComponent(fileId)
  return `/api/files/${encoded}/content`
}

export function filterReferenceDocuments(
  files: EvaluationFile[],
  filter: "all" | "template" | "plan" | "document",
  fixedFiles: EvaluationFile[],
): EvaluationFile[] {
  if (filter === "all") return files
  if (filter === "template") {
    return files.filter(
      (f) =>
        f.id === FIXED_TEMPLATE_ID ||
        f.id === FIXED_PLAN_TEMPLATE_ID ||
        f.id === FIXED_PLAN_LIVE_ID ||
        f.id === FIXED_PLAN_HWPX_PREVIEW_ID ||
        f.id === FIXED_EVAL_HWPX_PREVIEW_ID ||
        f.id === FIXED_EVALUATION_LIVE_ID,
    )
  }
  if (filter === "plan") {
    return files.filter(
      (f) =>
        f.id === FIXED_PLAN_ID ||
        f.id === FIXED_PLAN_TEMPLATE_ID ||
        f.type.includes("계획") ||
        f.name.includes("사업계획") ||
        f.name.includes("단위사업계획") ||
        /\.hwpx$/i.test(f.name) ||
        (f.mimeType ?? "").includes("hwp"),
    )
  }
  const fixedIds = new Set(fixedFiles.map((f) => f.id))
  return files.filter((f) => !fixedIds.has(f.id) && f.source === "file-manager")
}

export function taskFilesFromManagerItems(
  items: Array<{
    id: string
    name: string
    type?: string
    taskId?: string
    mimeType?: string
  }>,
  taskId: string,
): EvaluationFile[] {
  const needle = normalizeTaskId(taskId)
  return items
    .filter((item) => item.type !== "folder")
    .filter((item) => item.taskId && normalizeTaskId(item.taskId) === needle)
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: FILE_TYPE_LABELS[item.type ?? ""] ?? "첨부",
      source: "file-manager" as const,
      mimeType: item.mimeType,
      fileType: item.type,
    }))
}

export type DefaultDocumentSelection = {
  /** 사업계획 탭: 실시간 계획서 미러를 기본 선택 */
  preferPlanLive?: boolean
  /** @deprecated preferPlanLive 사용 */
  preferPlanTemplate?: boolean
  /** 사업평가 탭: 실시간 평가서 미러를 기본 선택 */
  preferEvaluationLive?: boolean
}

export function defaultSelectedDocumentId(
  files: EvaluationFile[],
  options?: DefaultDocumentSelection,
): string {
  if (options?.preferEvaluationLive) {
    const live = files.find((f) => f.id === FIXED_EVALUATION_LIVE_ID)
    if (live) return live.id
  }
  if (options?.preferPlanLive || options?.preferPlanTemplate) {
    const planLive = files.find((f) => f.id === FIXED_PLAN_LIVE_ID)
    if (planLive) return planLive.id
    const planTemplate = files.find((f) => f.id === FIXED_PLAN_TEMPLATE_ID)
    if (planTemplate) return planTemplate.id
  }
  const plan = files.find((f) => f.id === FIXED_PLAN_ID)
  if (plan) return plan.id
  return files[0]?.id ?? ""
}

export type ReferencePreviewContext = {
  planDocument: BusinessPlanDocument | null
  evaluation?: BusinessEvaluationData | null
}
