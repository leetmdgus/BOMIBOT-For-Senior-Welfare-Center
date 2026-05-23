"use client"

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import {
  A4DocumentViewport,
  DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM,
} from "@/components/common/a4-document-viewport"
import { AddDocumentBlocksBar } from "@/components/kanban/task-detail/add-document-blocks-bar"
import { BusinessPlanTableBlock } from "@/components/kanban/task-detail/business-plan-table-block"
import { BusinessEvaluationSummaryForm } from "@/components/kanban/task-detail/business-evaluation-summary-form"
import {
  HwpxBodyContentBlock,
  HwpxContentBlock,
  HwpxDocument,
  HwpxTextarea,
} from "@/components/kanban/task-detail/hwpx-document-ui"
import {
  applyPlanFormDataToEvaluation,
  evaluationToPlanFormData,
} from "@/lib/evaluation-plan-form-adapter"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  BusinessEvaluationData,
  BusinessPlanSection,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

import {
  RichTextToolbarProvider,
  useRichTextEditorSlot,
  useRichTextToolbarOptional,
} from "@/components/kanban/task-detail/rich-text-toolbar-context"
import { StickyRichTextToolbar } from "@/components/kanban/task-detail/sticky-rich-text-toolbar"
import { BusinessPlanRichText } from "./business-plan-rich-text"

type BusinessEvaluationEditorProps = {
  evaluation: BusinessEvaluationData
  canEdit: boolean
  datePickerOpen: boolean
  onDatePickerOpenChange: (open: boolean) => void
  onEvaluationChange: (next: BusinessEvaluationData) => void
  setSectionRef: (sectionId: string) => (element: HTMLDivElement | null) => void
  onAddHeading?: () => void
  onAddBody?: () => void
  /** 사업계획서 사업명 (제목 `{사업이름} 최종사업평가서` 연동) */
  planProjectName?: string
}

export function BusinessEvaluationEditor({
  evaluation,
  canEdit,
  datePickerOpen,
  onDatePickerOpenChange,
  onEvaluationChange,
  setSectionRef,
  onAddHeading,
  onAddBody,
  planProjectName,
}: BusinessEvaluationEditorProps) {
  const updateSection = (
    sectionId: string,
    patch: Partial<EvaluationSection>,
  ) => {
    onEvaluationChange({
      ...evaluation,
      sections: evaluation.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    })
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const next = [...evaluation.sections]
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onEvaluationChange({ ...evaluation, sections: next })
  }

  const deleteSection = (sectionId: string) => {
    onEvaluationChange({
      ...evaluation,
      sections: evaluation.sections.filter((s) => s.id !== sectionId),
    })
  }

  const bodyCount = evaluation.sections.filter((s) => s.type === "body").length
  const toolbarCtx = useRichTextToolbarOptional()

  const focusBlock = (id: string, label: string) => {
    toolbarCtx?.registerFieldBlock(id, label)
    toolbarCtx?.activateFieldBlock(id)
  }

  return (
    <RichTextToolbarProvider enabled={canEdit}>
      <div className="business-evaluation-editor min-w-0 space-y-4">
      <section aria-label="평가서 요약">
        <A4DocumentViewport
          fitToViewport={false}
          pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
        >
        <BusinessEvaluationSummaryForm
          evaluation={evaluation}
          canEdit={canEdit}
          datePickerOpen={datePickerOpen}
          onDatePickerOpenChange={onDatePickerOpenChange}
          onEvaluationChange={onEvaluationChange}
          businessName={planProjectName}
        />
        </A4DocumentViewport>
      </section>

      <section aria-label="평가 본문" className="space-y-4">
        <div className="print-hide border-b border-black/20 pb-3" aria-hidden>
          <h3 className="text-base font-semibold">추가 본문</h3>
          <p className="mt-0.5 text-sm text-neutral-600">
            위 요약 표와 아래 추가 본문 모두 블록입니다. 칸을 클릭하면 좌측 서식 툴바가
            적용됩니다.
          </p>
        </div>

        {evaluation.sections.length === 0 ? (
          <div className="border border-dashed border-black/40 bg-[#fafafa] px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              아직 추가 본문이 없습니다. 아래에서 블록을 추가하세요.
            </p>
          </div>
        ) : (
          <A4DocumentViewport
            fitToViewport={false}
            pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
          >
          <HwpxDocument className="shadow-none">
            {evaluation.sections.map((section, index) => {
              const sectionBodyIndex =
                section.type === "body"
                  ? evaluation.sections
                      .slice(0, index + 1)
                      .filter((s) => s.type === "body").length
                  : 0

              return (
                <div
                  key={section.id}
                  ref={setSectionRef(section.id)}
                  className="scroll-mt-28"
                >
                  {section.type === "heading" ? (
                    <div className="hwpx-doc-section-row">
                      <div className="w-full min-w-0">
                        <HwpxContentBlock label="대목차" embedded>
                          <HwpxTextarea
                            value={section.title}
                            onChange={(title) =>
                              updateSection(section.id, { title })
                            }
                            onFocus={() =>
                              focusBlock(
                                `eval-heading-${section.id}`,
                                section.title?.trim() || "대목차",
                              )
                            }
                            readOnly={!canEdit}
                            placeholder="대목차 제목"
                            rows={2}
                            className="text-lg font-semibold"
                          />
                        </HwpxContentBlock>
                      </div>
                      {canEdit ? (
                        <SectionControls
                          index={index}
                          onMove={moveSection}
                          onDelete={() => deleteSection(section.id)}
                          className="hwpx-doc-section-row__controls"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <EvaluationBodyBlock
                      section={section}
                      bodyIndex={sectionBodyIndex}
                      canEdit={canEdit}
                      onTitleChange={(title) =>
                        updateSection(section.id, { title })
                      }
                      onContentChange={(content) =>
                        updateSection(section.id, { content })
                      }
                      controls={
                        canEdit ? (
                          <SectionControls
                            index={index}
                            onMove={moveSection}
                            onDelete={() => deleteSection(section.id)}
                            className="hwpx-doc-section-row__controls"
                          />
                        ) : null
                      }
                    />
                  )}
                </div>
              )
            })}
          </HwpxDocument>
          </A4DocumentViewport>
        )}

        {canEdit && onAddHeading && onAddBody ? (
          <AddDocumentBlocksBar
            onAddHeading={onAddHeading}
            onAddBody={onAddBody}
            sectionCount={evaluation.sections.length}
            bodyCount={bodyCount}
          />
        ) : null}
      </section>

      {canEdit ? <StickyRichTextToolbar /> : null}
      </div>
    </RichTextToolbarProvider>
  )
}

function EvaluationTableSection({
  section,
  evaluation,
  canEdit,
  onSectionChange,
  onEvaluationChange,
}: {
  section: EvaluationSection
  evaluation: BusinessEvaluationData
  canEdit: boolean
  onSectionChange: (patch: Partial<EvaluationSection>) => void
  onEvaluationChange: (next: BusinessEvaluationData) => void
}) {
  const planSection: BusinessPlanSection = {
    id: 0,
    type: "table",
    title: section.title,
    content: section.content,
  }
  const formData = evaluationToPlanFormData(evaluation)

  return (
    <BusinessPlanTableBlock
      section={planSection}
      formData={formData}
      readOnly={!canEdit}
      onSectionChange={(patch) =>
        onSectionChange({
          title: patch.title ?? section.title,
          content: patch.content ?? section.content,
        })
      }
      onFormDataChange={(nextForm) =>
        onEvaluationChange(applyPlanFormDataToEvaluation(evaluation, nextForm))
      }
    />
  )
}

function EvaluationBodyBlock({
  section,
  bodyIndex,
  canEdit,
  onTitleChange,
  onContentChange,
  controls,
}: {
  section: EvaluationSection
  bodyIndex: number
  canEdit: boolean
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  controls?: React.ReactNode
}) {
  const label = section.title?.trim() || `본문 ${bodyIndex}`
  const { setEditor, onActivate, variant } = useRichTextEditorSlot(
    section.id,
    label,
  )

  return (
    <div className="hwpx-doc-section-row">
      <div className="w-full min-w-0">
        <HwpxBodyContentBlock
          title={section.title ?? ""}
          onTitleChange={onTitleChange}
          readOnly={!canEdit}
          onTitleFocus={onActivate}
          embedded
        >
          <BusinessPlanRichText
            ref={setEditor}
            value={section.content}
            onChange={onContentChange}
            readOnly={!canEdit}
            variant={variant}
            inlineToolbar={false}
            minHeight={280}
            onActivate={onActivate}
          />
        </HwpxBodyContentBlock>
      </div>
      {controls}
    </div>
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
  onDelete: () => void
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
        className="size-7 p-0"
        onClick={() => onMove(index, "up")}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0"
        onClick={() => onMove(index, "down")}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 p-0 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
