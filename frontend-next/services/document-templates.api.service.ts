/** 사용자 업로드 문서 양식(템플릿) API. */

import {
  apiClient,
  apiFetchBlobWithMeta,
  apiUploadFormData,
  resolveApiPath,
} from "@/lib/api-client"
import { triggerBlobDownload } from "@/lib/files/download-blob"

import type {
  DocumentTemplateDetail,
  DocumentTemplateKind,
  DocumentTemplateMeta,
  HwpxFrontendJson,
} from "./document-templates.types"

const base = (path = "") =>
  resolveApiPath(`/api/document-templates${path}`, `/api/v1/document-templates${path}`)

/** 이전 양식 불러오기 — 업로드한 템플릿 목록(최신순). */
export async function listDocumentTemplates(): Promise<DocumentTemplateMeta[]> {
  const result = await apiClient.get<{ templates: DocumentTemplateMeta[] }>(base())
  return result.templates ?? []
}

/** 양식 업로드(.hwpx) → 파싱·보관 → 메타. kind 로 계획/평가 태그. */
export async function uploadDocumentTemplate(
  file: File,
  name?: string,
  kind?: DocumentTemplateKind,
): Promise<DocumentTemplateMeta> {
  const form = new FormData()
  form.append("file", file)
  if (name) form.append("name", name)
  if (kind) form.append("kind", kind)
  return apiUploadFormData<DocumentTemplateMeta>(base(), form)
}

/** 메타 + 편집용 frontendJson(원본 재파싱). */
export async function getDocumentTemplate(
  templateId: string,
): Promise<DocumentTemplateDetail> {
  return apiClient.get<DocumentTemplateDetail>(base(`/${encodeURIComponent(templateId)}`))
}

export async function deleteDocumentTemplate(templateId: string): Promise<void> {
  await apiClient.delete<{ deleted: boolean }>(base(`/${encodeURIComponent(templateId)}`))
}

/** 업로드 양식에 계획/평가 값을 라벨 매칭으로 채운 frontendJson(WYSIWYG 초기값). */
export async function prefillDocumentTemplate(
  templateId: string,
  kind: DocumentTemplateKind,
  data: Record<string, unknown>,
): Promise<HwpxFrontendJson> {
  const result = await apiClient.post<{ frontendJson: HwpxFrontendJson }>(
    base(`/${encodeURIComponent(templateId)}/prefill`),
    { kind, data },
  )
  return result.frontendJson
}

/** 채운 frontendJson 을 원본 양식에 반영한 HWPX 다운로드. sections(추가본문)는 끝에 합침. */
export async function exportFilledTemplate(
  templateId: string,
  frontendJson: HwpxFrontendJson,
  downloadFilename?: string,
  sections?: unknown[],
): Promise<void> {
  const form = new FormData()
  form.append("frontendJson", JSON.stringify(frontendJson))
  if (sections && sections.length) form.append("sections", JSON.stringify(sections))
  if (downloadFilename) form.append("downloadFilename", downloadFilename)

  const { blob, filename } = await apiFetchBlobWithMeta(
    base(`/${encodeURIComponent(templateId)}/export`),
    { method: "POST", body: form },
  )
  triggerBlobDownload(blob, filename ?? downloadFilename ?? "양식.hwpx")
}
