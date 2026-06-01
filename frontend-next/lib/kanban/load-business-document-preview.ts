import {
  fetchBusinessEvaluationHwpxPreviewHtml,
  fetchBusinessPlanHwpxPreviewHtml,
} from "@/lib/hwpx/fetch-hwpx-preview"
import { documentSectionsForHwpxExport } from "@/lib/hwpx/document-sections-for-export"
import { toSaveBusinessEvaluationPayload } from "@/lib/kanban/evaluation-save-payload"
import {
  isOfficePreviewableFile,
  loadOfficePreviewHtml,
  wrapOfficePreviewDocument,
} from "@/lib/files/office-preview"
import { downloadFileBlob } from "@/services/files.service"
import {
  getBusinessEvaluation,
  getBusinessPlan,
} from "@/services/kanban.task-detail.service"
import type { BusinessDocumentSearchResult } from "@/services/kanban.documents-search.types"
import type { BusinessPlanSection } from "@/services/kanban.task-detail.types"

export type BusinessDocumentPreview =
  | { mode: "hwpx"; html: string }
  | { mode: "office"; html: string }
  | { mode: "image"; blobUrl: string; name: string }
  | { mode: "pdf"; blobUrl: string; name: string }
  | { mode: "video"; blobUrl: string; name: string }
  | { mode: "unsupported"; message: string }

function guessFileName(result: BusinessDocumentSearchResult): string {
  const fromTitle = result.title.replace(/^첨부 ·\s*/, "").replace(/\s*\([^)]+\)\s*$/, "")
  return fromTitle.trim() || "파일"
}

export async function loadBusinessDocumentPreview(
  result: BusinessDocumentSearchResult,
): Promise<BusinessDocumentPreview> {
  const taskId = result.taskId
  if (!taskId) {
    return { mode: "unsupported", message: "업무 정보가 없어 미리보기할 수 없습니다." }
  }

  if (result.docKind === "plan") {
    const plan = await getBusinessPlan(taskId)
    const html = await fetchBusinessPlanHwpxPreviewHtml(taskId, {
      formData: plan.formData,
      sections: documentSectionsForHwpxExport(
        plan.sections ?? [],
      ) as BusinessPlanSection[],
    })
    return { mode: "hwpx", html }
  }

  if (result.docKind === "evaluation") {
    const evaluation = await getBusinessEvaluation(taskId)
    const html = await fetchBusinessEvaluationHwpxPreviewHtml(taskId, {
      evaluation: {
        ...toSaveBusinessEvaluationPayload(evaluation),
        sections: documentSectionsForHwpxExport(evaluation.sections ?? []),
      },
    })
    return { mode: "hwpx", html }
  }

  if (result.docKind === "file" && result.fileId) {
    const name = guessFileName(result)
    const lower = name.toLowerCase()

    if (isOfficePreviewableFile(name)) {
      const html = await loadOfficePreviewHtml(result.fileId, { name })
      return {
        mode: "office",
        html: wrapOfficePreviewDocument(html, name),
      }
    }

    const blob = await downloadFileBlob?.(result.fileId)
    if (!blob) {
      return {
        mode: "unsupported",
        message: "파일 내용을 불러올 수 없습니다.",
      }
    }
    const blobUrl = URL.createObjectURL(blob)

    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) {
      return { mode: "image", blobUrl, name }
    }
    if (/\.pdf$/i.test(lower)) {
      return { mode: "pdf", blobUrl, name }
    }
    if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(lower)) {
      return { mode: "video", blobUrl, name }
    }

    URL.revokeObjectURL(blobUrl)
    return {
      mode: "unsupported",
      message: "이 파일 형식은 문서 미리보기를 지원하지 않습니다.",
    }
  }

  return { mode: "unsupported", message: "미리보기를 지원하지 않는 문서입니다." }
}
