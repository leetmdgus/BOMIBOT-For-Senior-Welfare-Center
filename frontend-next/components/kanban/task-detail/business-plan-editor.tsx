"use client"

import { useCallback, useEffect } from "react"

import {
  A4DocumentViewport,
  DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM,
} from "@/components/common/a4-document-viewport"
import { DocumentMediaSections } from "@/components/kanban/task-detail/document-media-sections"
import { DocumentSectionsTable } from "@/components/kanban/task-detail/document-sections-table"
import { TemplateDocumentEditor } from "@/components/kanban/task-detail/template-doc/template-document-editor"
import type { HwpxFrontendJson } from "@/services/document-templates.types"
import {
  formalEmptyDocumentHtml,
  nextFormalHeadingTitle,
} from "@/lib/formal-document-html"
import {
  HwpxDocument,
  HwpxDocumentTitle,
  HwpxLabel,
  HwpxTable,
  HwpxValue,
} from "@/components/kanban/task-detail/hwpx-document-ui"
import { Input } from "@/components/ui/input"
import {
  findSectionIndex,
  isDocumentSectionType,
  mergeDocumentSectionsInOrder,
} from "@/lib/kanban/document-section-blocks"
import { PLAN_HWPX_TEMPLATE_TITLE } from "@/lib/kanban/task-reference-documents"
import { cn } from "@/lib/utils"
import type {
  BusinessPlanFormData,
  BusinessPlanSection,
} from "@/services/kanban.task-detail.types"

import {
  LineSlotGoalsInput,
  LineSlotInput,
} from "@/components/kanban/task-detail/line-slot-input"
import {
  RichTextToolbarProvider,
  useRichTextToolbarOptional,
} from "@/components/kanban/task-detail/rich-text-toolbar-context"

type BusinessPlanEditorProps = {
  formData: BusinessPlanFormData
  sections: BusinessPlanSection[]
  readOnly: boolean
  taskId?: string
  onFormDataChange: (next: BusinessPlanFormData) => void
  onSectionsChange: (next: BusinessPlanSection[]) => void
  /** 사업평가 우측 참고 패널 — 읽기 전용 전체 계획서 */
  referenceMode?: boolean
  /** 선택 양식 WYSIWYG — 있으면 요약표 대신 양식 위에서 직접 편집(첨부·추가본문은 유지) */
  templateJson?: HwpxFrontendJson | null
  onTemplateJsonChange?: (next: HwpxFrontendJson) => void
}

const createSectionId = () => Date.now() + Math.floor(Math.random() * 1000)

const PLAN_FIELD_BLOCKS: [string, string][] = [
  ["plan-project-name", "사업명"],
  ["plan-purpose", "목적"],
  ["plan-goals", "목표"],
  ["plan-period", "사업기간"],
  ["plan-target", "사업대상"],
  ["plan-total-count", "연인원수/횟수"],
  ["plan-budget", "소요예산"],
  ["plan-budget-category", "예산과목"],
  ["plan-manager", "담당"],
]

function usePlanFieldBlocks(subProjects: { name: string }[]) {
  const ctx = useRichTextToolbarOptional()

  useEffect(() => {
    if (!ctx) return
    for (const [id, label] of PLAN_FIELD_BLOCKS) {
      ctx.registerFieldBlock(id, label)
    }
    subProjects.forEach((sub, index) => {
      ctx.registerFieldBlock(`plan-sub-${index}`, `세부사업 · ${sub.name}`)
    })
  }, [ctx, subProjects])

  return useCallback(
    (id: string) => () => {
      ctx?.activateFieldBlock(id)
    },
    [ctx],
  )
}

export function BusinessPlanEditor({
  formData,
  sections,
  readOnly,
  taskId,
  onFormDataChange,
  onSectionsChange,
  referenceMode = false,
  templateJson = null,
  onTemplateJsonChange,
}: BusinessPlanEditorProps) {
  const isReference = referenceMode
  const effectiveReadOnly = readOnly || isReference
  const updateForm = (patch: Partial<BusinessPlanFormData>) => {
    onFormDataChange({ ...formData, ...patch })
  }

  const addHeading = () => {
    const headingCount = sections.filter((section) => section.type === "heading")
      .length
    onSectionsChange([
      ...sections,
      {
        id: createSectionId(),
        type: "heading",
        title: nextFormalHeadingTitle(headingCount),
      },
    ])
  }

  const addBody = () => {
    onSectionsChange([
      ...sections,
      {
        id: createSectionId(),
        type: "body",
        title: "",
        content: formalEmptyDocumentHtml(),
      },
    ])
  }

  const updateSection = (index: number, patch: Partial<BusinessPlanSection>) => {
    onSectionsChange(
      sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    )
  }

  const activateBlock = usePlanFieldBlocks(formData.subProjects)
  const docSections = sections.filter(isDocumentSectionType)

  const handleDocSectionsChange = (nextDocSections: BusinessPlanSection[]) => {
    onSectionsChange(mergeDocumentSectionsInOrder(sections, nextDocSections))
  }

  return (
    <RichTextToolbarProvider enabled={!effectiveReadOnly}>
      <div
        className={cn(
          "business-plan-editor min-w-0 space-y-4",
          isReference && "reference-plan-editor",
        )}
      >
        {templateJson ? (
          <section aria-label="사업계획 요약 (선택 양식)" className="space-y-2">
            {!effectiveReadOnly ? (
              <p className="print-hide border border-black/15 bg-[#fafafa] px-4 py-2 text-center text-[11px] text-neutral-600">
                선택한 양식 위에서 칸을 직접 클릭해 입력합니다. 대목차·본문은 아래
                「추가 본문」에서 유지됩니다.
              </p>
            ) : null}
            <TemplateDocumentEditor
              frontendJson={templateJson}
              readOnly={effectiveReadOnly}
              onChange={(next) => onTemplateJsonChange?.(next)}
            />
          </section>
        ) : (
          <section aria-label="사업계획 요약">
          <A4DocumentViewport
            fitToViewport={false}
            pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
          >
            <HwpxDocument compact={isReference}>
              <HwpxDocumentTitle>{PLAN_HWPX_TEMPLATE_TITLE}</HwpxDocumentTitle>

              {isReference ? (
                <p className="print-hide border-b border-black/15 bg-[#f5f5f5] px-3 py-1.5 text-center text-[10px] text-neutral-600">
                  참고용 사업계획서 · 읽기 전용
                </p>
              ) : !effectiveReadOnly ? (
                <p className="print-hide border-b border-black/15 bg-[#fafafa] px-4 py-2 text-center text-[11px] text-neutral-600">
                  요약 표는 칸을 클릭해 입력합니다. 대목차·본문은 아래
                  「추가 본문」에서 추가합니다.
                </p>
              ) : null}

              <HwpxTable className="table-fixed w-full">
                <colgroup>
                  <col className="w-[12rem]" />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <tbody>
                  <FormRow label="사 업 명">
                    {effectiveReadOnly ? (
                      <span>{formData.projectName}</span>
                    ) : (
                      <Input
                        value={formData.projectName}
                        onChange={(e) => updateForm({ projectName: e.target.value })}
                        onFocus={activateBlock("plan-project-name")}
                        className="hwpx-inline-input w-full"
                      />
                    )}
                  </FormRow>
                  <FormRow label="목 적">
                    <LineSlotInput
                      value={formData.purpose}
                      onChange={(purpose) => updateForm({ purpose })}
                      readOnly={effectiveReadOnly}
                      minRows={2}
                      onFocus={activateBlock("plan-purpose")}
                    />
                  </FormRow>
                  <FormRow label="목 표">
                    <LineSlotGoalsInput
                      goals={formData.goals}
                      onChange={(goals) => updateForm({ goals })}
                      readOnly={effectiveReadOnly}
                      onFocus={activateBlock("plan-goals")}
                    />
                  </FormRow>
                  <FormRow
                    label="사 업 기 간"
                    value={formData.period}
                    readOnly={effectiveReadOnly}
                    field="period"
                    onForm={updateForm}
                    onFocus={activateBlock("plan-period")}
                  />
                  <FormRow
                    label="사 업 대 상"
                    value={formData.target}
                    readOnly={effectiveReadOnly}
                    field="target"
                    onForm={updateForm}
                    onFocus={activateBlock("plan-target")}
                  />
                  <FormRow
                    label="연 인 원 수 / 횟 수"
                    value={formData.totalCount}
                    readOnly={effectiveReadOnly}
                    field="totalCount"
                    onForm={updateForm}
                    labelClassName="w-[12rem]"
                    valueClassName="min-w-0"
                    onFocus={activateBlock("plan-total-count")}
                  />
                  <FormRow
                    label="소 요 예 산"
                    value={formData.budget}
                    readOnly={effectiveReadOnly}
                    field="budget"
                    onForm={updateForm}
                    onFocus={activateBlock("plan-budget")}
                  />
                  <FormRow
                    label="예 산 과 목"
                    value={formData.budgetCategory}
                    readOnly={effectiveReadOnly}
                    field="budgetCategory"
                    onForm={updateForm}
                    onFocus={activateBlock("plan-budget-category")}
                  />
                  <FormRow
                    label="담 당"
                    value={formData.manager}
                    readOnly={effectiveReadOnly}
                    field="manager"
                    onForm={updateForm}
                    onFocus={activateBlock("plan-manager")}
                  />
                </tbody>
              </HwpxTable>

              <div className="border-x border-t border-black bg-[#ececec] px-2 py-2 text-center text-sm font-semibold">
                세부사업
              </div>

              <HwpxTable>
                <thead>
                  <tr>
                    <HwpxLabel className="w-[28%]">세부사업명</HwpxLabel>
                    <HwpxLabel>내용</HwpxLabel>
                  </tr>
                </thead>
                <tbody>
                  {formData.subProjects.map((sub, index) => (
                    <tr key={sub.name}>
                      <HwpxValue className="align-top font-medium">{sub.name}</HwpxValue>
                      <HwpxValue className="align-top">
                        <LineSlotInput
                          value={sub.output}
                          onChange={(output) => {
                            const subProjects = [...formData.subProjects]
                            subProjects[index] = { ...sub, output }
                            updateForm({ subProjects })
                          }}
                          readOnly={effectiveReadOnly}
                          minRows={2}
                          onFocus={activateBlock(`plan-sub-${index}`)}
                        />
                      </HwpxValue>
                    </tr>
                  ))}
                </tbody>
              </HwpxTable>
            </HwpxDocument>
          </A4DocumentViewport>
          </section>
        )}

        <section aria-label="첨부 자료" className="print-hide space-y-2">
          <A4DocumentViewport
            fitToViewport={false}
            pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
          >
            <HwpxDocument className="shadow-none">
              <DocumentMediaSections
                sections={sections}
                readOnly={effectiveReadOnly}
                taskId={taskId}
                createSectionId={createSectionId}
                onSectionsChange={onSectionsChange}
              />
            </HwpxDocument>
          </A4DocumentViewport>
        </section>

        <section aria-label="추가 본문" className="space-y-2">
          <div className="print-hide flex items-center justify-between gap-2 border border-b-0 border-black bg-[#f5f5f5] px-3 py-2">
            <h3 className="text-sm font-medium text-neutral-700">추가 본문</h3>
            {!effectiveReadOnly ? (
              <p className="text-[11px] text-muted-foreground">
                「대목차」 또는 「목차·본문」으로 섹션을 추가합니다.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">읽기 전용</p>
            )}
          </div>

          <A4DocumentViewport
            fitToViewport={false}
            pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
          >
            <HwpxDocument className="shadow-none">
              <DocumentSectionsTable
                sections={docSections}
                readOnly={effectiveReadOnly}
                onHeadingChange={(sectionId, title) => {
                  const index = findSectionIndex(sections, sectionId)
                  if (index >= 0) updateSection(index, { title })
                }}
                onBodyChange={(sectionId, patch) => {
                  const index = findSectionIndex(sections, sectionId)
                  if (index >= 0) updateSection(index, patch)
                }}
                onSectionsChange={handleDocSectionsChange}
                onAddHeading={isReference ? undefined : addHeading}
                onAddBody={isReference ? undefined : addBody}
              />
            </HwpxDocument>
          </A4DocumentViewport>
        </section>
      </div>
    </RichTextToolbarProvider>
  )
}

function FormRow({
  label,
  value,
  readOnly,
  field,
  onForm,
  children,
  labelClassName,
  valueClassName,
  onFocus,
}: {
  label: string
  value?: string
  readOnly?: boolean
  field?: keyof BusinessPlanFormData
  onForm?: (patch: Partial<BusinessPlanFormData>) => void
  children?: React.ReactNode
  labelClassName?: string
  valueClassName?: string
  onFocus?: () => void
}) {
  return (
    <tr>
      <HwpxLabel
        className={cn(
          "w-[10rem] max-w-[40%] whitespace-normal leading-snug",
          labelClassName,
        )}
      >
        {label}
      </HwpxLabel>
      <HwpxValue colSpan={3} className={cn("min-w-0 w-full", valueClassName)}>
        {children ??
          (readOnly || !field || !onForm ? (
            <span className="block min-w-0 break-words leading-relaxed">
              {value}
            </span>
          ) : (
            <Input
              value={value ?? ""}
              onChange={(e) =>
                onForm({ [field]: e.target.value } as Partial<BusinessPlanFormData>)
              }
              onFocus={onFocus}
              className="hwpx-inline-input w-full min-w-0"
            />
          ))}
      </HwpxValue>
    </tr>
  )
}

