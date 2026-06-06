import { shouldUseMockApi } from "@/lib/api-service-mode"
import {
  documentSectionsForHwpxExport,
  mergeFlushedDocumentSections,
} from "@/lib/hwpx/document-sections-for-export"
import { wrapHwpxPageHtml } from "@/lib/hwp-ast/pageCanvas"
import { apiFetchText } from "@/lib/api-client"
import type {
  BusinessEvaluationData,
  BusinessPlanFormData,
  BusinessPlanSection,
  SaveBusinessEvaluationPayload,
} from "@/services/kanban.task-detail.types"

const base = (path: string) => `/api/kanban/task-detail${path}`

export async function fetchBusinessPlanHwpxPreviewHtml(
  taskId: string,
  payload: {
    formData: BusinessPlanFormData
    sections: BusinessPlanSection[]
    templateId?: string | null
  },
): Promise<string> {
  const sections = documentSectionsForHwpxExport(
    mergeFlushedDocumentSections(payload.sections),
  )

  if (shouldUseMockApi()) {
    return wrapHwpxPageHtml(
      "<p>Mock 모드 — API 연결 시 템플릿 기반 HWPX 미리보기가 표시됩니다.</p>",
      { title: payload.formData.projectName || "사업계획서" },
    )
  }

  return apiFetchText(base("/business-plan/hwpx/preview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId,
      formData: payload.formData,
      sections,
      ...(payload.templateId ? { templateId: payload.templateId } : {}),
    }),
  })
}

export async function fetchBusinessEvaluationHwpxPreviewHtml(
  taskId: string,
  payload: {
    evaluation: SaveBusinessEvaluationPayload | BusinessEvaluationData
    templateId?: string | null
  },
): Promise<string> {
  const evaluation = {
    ...payload.evaluation,
    sections: documentSectionsForHwpxExport(
      mergeFlushedDocumentSections(payload.evaluation.sections ?? []),
    ),
  }

  if (shouldUseMockApi()) {
    return wrapHwpxPageHtml(
      "<p>Mock 모드 — API 연결 시 템플릿 기반 HWPX 미리보기가 표시됩니다.</p>",
      { title: "사업평가서" },
    )
  }

  return apiFetchText(base("/evaluation/hwpx/preview"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId,
      evaluation,
      ...(payload.templateId ? { templateId: payload.templateId } : {}),
    }),
  })
}
