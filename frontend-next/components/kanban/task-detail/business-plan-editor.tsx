"use client"

import { useCallback, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  Upload,
} from "lucide-react"

import {
  A4DocumentViewport,
  DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM,
} from "@/components/common/a4-document-viewport"
import { AddDocumentBlocksBar } from "@/components/kanban/task-detail/add-document-blocks-bar"
import { BusinessPlanTableBlock } from "@/components/kanban/task-detail/business-plan-table-block"
import { formalEmptyDocumentHtml } from "@/lib/formal-document-html"
import {
  HwpxBodyContentBlock,
  HwpxContentBlock,
  HwpxDocument,
  HwpxDocumentTitle,
  HwpxLabel,
  HwpxTable,
  HwpxTextarea,
  HwpxValue,
} from "@/components/kanban/task-detail/hwpx-document-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  useRichTextEditorSlot,
  useRichTextToolbarOptional,
} from "@/components/kanban/task-detail/rich-text-toolbar-context"
import { StickyRichTextToolbar } from "@/components/kanban/task-detail/sticky-rich-text-toolbar"
import { BusinessPlanRichText } from "./business-plan-rich-text"

type BusinessPlanEditorProps = {
  formData: BusinessPlanFormData
  sections: BusinessPlanSection[]
  readOnly: boolean
  onFormDataChange: (next: BusinessPlanFormData) => void
  onSectionsChange: (next: BusinessPlanSection[]) => void
  onPreview: () => void
  previewMode?: boolean
  /** 사업평가 우측 참고 패널 — 읽기 전용 전체 계획서 */
  referenceMode?: boolean
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
  onFormDataChange,
  onSectionsChange,
  onPreview,
  previewMode = false,
  referenceMode = false,
}: BusinessPlanEditorProps) {
  const isReference = referenceMode
  const effectiveReadOnly = readOnly || isReference
  const updateForm = (patch: Partial<BusinessPlanFormData>) => {
    onFormDataChange({ ...formData, ...patch })
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const next = [...sections]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= next.length) return
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    onSectionsChange(next)
  }

  const deleteSection = (index: number) => {
    onSectionsChange(sections.filter((_, i) => i !== index))
  }

  const addHeading = () => {
    onSectionsChange([
      ...sections,
      {
        id: createSectionId(),
        type: "heading",
        title: "새 제목",
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

  return (
    <RichTextToolbarProvider enabled={!effectiveReadOnly}>
      <div
        className={cn(
          "business-plan-editor space-y-4",
          isReference && "reference-plan-editor",
        )}
      >
      <A4DocumentViewport
        fitToViewport={false}
        pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
      >
      <HwpxDocument compact={isReference}>
        <HwpxDocumentTitle>사회복지사업 단위사업계획서</HwpxDocumentTitle>

        {isReference ? (
          <p className="print-hide border-b border-black/15 bg-[#f5f5f5] px-3 py-1.5 text-center text-[10px] text-neutral-600">
            참고용 사업계획서 · 읽기 전용
          </p>
        ) : !effectiveReadOnly ? (
          <p className="print-hide border-b border-black/15 bg-[#fafafa] px-4 py-2 text-center text-[11px] text-neutral-600">
            표 칸을 클릭하면 좌측 서식 툴바가 연결됩니다. 본문(고급 서식)은 아래
            「추가 본문」에서 이어서 작성할 수 있습니다.
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
        {sections.map((section, index) => {
          const bodyIndex =
            section.type === "body"
              ? sections
                  .slice(0, index + 1)
                  .filter((s) => s.type === "body").length
              : 0

          return (
          <div key={section.id} className="hwpx-doc-section-row">
            <div className="w-full min-w-0">
              {section.type === "file" && (
                <div className="p-4">
                <div className="print-hide flex items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={effectiveReadOnly}
                  >
                    <Upload className="mr-2 size-4" />
                    사진 및 파일 첨부
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    여기에 파일을 끌어 놓거나 왼쪽의 버튼을 클릭하세요.
                  </span>
                </div>
                </div>
              )}

              {section.type === "heading" && (
                <HwpxContentBlock label="대목차" embedded>
                  {effectiveReadOnly ? (
                    <h3 className="text-base font-semibold">{section.title}</h3>
                  ) : (
                    <Input
                      value={section.title}
                      onChange={(e) =>
                        updateSection(index, { title: e.target.value })
                      }
                      className="hwpx-inline-input w-full text-base font-semibold"
                      placeholder="대목차 제목"
                    />
                  )}
                </HwpxContentBlock>
              )}

              {section.type === "body" && (
                <BusinessPlanBodyBlock
                  section={section}
                  bodyIndex={bodyIndex}
                  readOnly={effectiveReadOnly}
                  onTitleChange={(title) => updateSection(index, { title })}
                  onContentChange={(content) =>
                    updateSection(index, { content })
                  }
                />
              )}

              {section.type === "table" && (
                <BusinessPlanTableBlock
                  section={section}
                  formData={formData}
                  readOnly={effectiveReadOnly}
                  onSectionChange={(patch) => updateSection(index, patch)}
                  onFormDataChange={onFormDataChange}
                />
              )}
            </div>

            {!effectiveReadOnly ? (
              <SectionControls
                index={index}
                onMove={moveSection}
                onDelete={deleteSection}
                className="hwpx-doc-section-row__controls"
              />
            ) : null}
          </div>
          )
        })}
      </HwpxDocument>
      </A4DocumentViewport>

      {!isReference ? (
        <div className="print-hide space-y-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onPreview}>
            <Eye className="mr-2 size-4" />
            {previewMode ? "편집으로" : "미리보기"}
          </Button>
          <AddDocumentBlocksBar
            readOnly={effectiveReadOnly}
            onAddHeading={addHeading}
            onAddBody={addBody}
            sectionCount={sections.length}
            bodyCount={sections.filter((s) => s.type === "body").length}
          />
          {!effectiveReadOnly ? <StickyRichTextToolbar /> : null}
        </div>
      ) : null}
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

function BusinessPlanBodyBlock({
  section,
  bodyIndex,
  readOnly,
  onTitleChange,
  onContentChange,
}: {
  section: BusinessPlanSection
  bodyIndex: number
  readOnly: boolean
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
}) {
  const label = section.title?.trim() || `본문 ${bodyIndex}`
  const { setEditor, onActivate, variant } = useRichTextEditorSlot(
    `plan-body-${section.id}`,
    label,
  )

  return (
    <HwpxBodyContentBlock
      title={section.title ?? ""}
      onTitleChange={onTitleChange}
      readOnly={readOnly}
      onTitleFocus={onActivate}
      embedded
    >
      <BusinessPlanRichText
        ref={setEditor}
        value={section.content ?? ""}
        onChange={onContentChange}
        readOnly={readOnly}
        variant={variant}
        inlineToolbar={false}
        minHeight={280}
        onActivate={onActivate}
      />
    </HwpxBodyContentBlock>
  )
}

function SectionControls({
  index,
  onMove,
  onDelete,
  className,
}: {
  index: number
  onMove: (index: number, direction: "up" | "down") => void
  onDelete: (index: number) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "print-hide flex flex-col items-center gap-1",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        onClick={() => onMove(index, "up")}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        onClick={() => onMove(index, "down")}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(index)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
