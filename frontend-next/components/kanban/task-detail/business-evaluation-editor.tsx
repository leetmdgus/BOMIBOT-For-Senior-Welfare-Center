"use client"

import {
  A4DocumentViewport,
  DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM,
} from "@/components/common/a4-document-viewport"
import { BusinessEvaluationSummaryForm } from "@/components/kanban/task-detail/business-evaluation-summary-form"
import { DocumentMediaSections } from "@/components/kanban/task-detail/document-media-sections"
import { DocumentSectionsTable } from "@/components/kanban/task-detail/document-sections-table"
import {
  isDocumentSectionType,
  mergeDocumentSectionsInOrder,
} from "@/lib/kanban/document-section-blocks"
import type { Dispatch, SetStateAction } from "react"
import type {
  BusinessEvaluationData,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

import {
  RichTextToolbarProvider,
} from "@/components/kanban/task-detail/rich-text-toolbar-context"
import { HwpxDocument } from "@/components/kanban/task-detail/hwpx-document-ui"

type BusinessEvaluationEditorProps = {
  evaluation: BusinessEvaluationData
  canEdit: boolean
  datePickerOpen: boolean
  onDatePickerOpenChange: (open: boolean) => void
  onEvaluationChange: Dispatch<SetStateAction<BusinessEvaluationData>>
  setSectionRef?: (sectionId: string) => (element: HTMLDivElement | null) => void
  onAddHeading?: () => void
  onAddBody?: () => void
  taskId?: string
  /** 사업평가 우측 참고 패널 — 읽기 전용 실시간 미러 */
  referenceMode?: boolean
  /** 사업계획서 사업명 (제목 `{사업이름} 최종사업평가서` 연동) */
  planProjectName?: string
}

export function BusinessEvaluationEditor({
  evaluation,
  canEdit,
  datePickerOpen,
  onDatePickerOpenChange,
  onEvaluationChange,
  onAddHeading,
  onAddBody,
  taskId,
  referenceMode = false,
  planProjectName,
}: BusinessEvaluationEditorProps) {
  const effectiveReadOnly = !canEdit || referenceMode
  const docSections = evaluation.sections.filter(isDocumentSectionType)
  const updateSection = (
    sectionId: string,
    patch: Partial<EvaluationSection>,
  ) => {
    onEvaluationChange((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }))
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
          canEdit={canEdit && !referenceMode}
          datePickerOpen={datePickerOpen}
          onDatePickerOpenChange={onDatePickerOpenChange}
          onEvaluationChange={onEvaluationChange}
          businessName={planProjectName}
        />
        </A4DocumentViewport>
      </section>

      <section aria-label="평가 본문" className="space-y-2">
        <div className="flex items-center justify-between gap-2 border border-b-0 border-black bg-[#f5f5f5] px-3 py-2">
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
              onHeadingChange={(sectionId, title) =>
                updateSection(sectionId, { title })
              }
              onBodyChange={(sectionId, patch) =>
                updateSection(sectionId, patch)
              }
              onSectionsChange={(nextDoc) =>
                onEvaluationChange((prev) => ({
                  ...prev,
                  sections: mergeDocumentSectionsInOrder(
                    prev.sections,
                    nextDoc,
                  ),
                }))
              }
              onAddHeading={
                canEdit && !referenceMode && onAddHeading
                  ? onAddHeading
                  : undefined
              }
              onAddBody={
                canEdit && !referenceMode && onAddBody ? onAddBody : undefined
              }
            />
          </HwpxDocument>
        </A4DocumentViewport>
      </section>

      <section aria-label="첨부 자료" className="print-hide space-y-2">
        <A4DocumentViewport
          fitToViewport={false}
          pageWidthMm={DOCUMENT_VIEWPORT_WIDTH_SINGLE_MM}
        >
          <HwpxDocument className="shadow-none">
            <DocumentMediaSections
              sections={evaluation.sections}
              readOnly={effectiveReadOnly}
              taskId={taskId}
              createSectionId={() =>
                `${Date.now()}-${Math.floor(Math.random() * 1000)}`
              }
              onSectionsChange={(next) =>
                onEvaluationChange((prev) => ({ ...prev, sections: next }))
              }
            />
          </HwpxDocument>
        </A4DocumentViewport>
      </section>

      </div>
    </RichTextToolbarProvider>
  )
}
