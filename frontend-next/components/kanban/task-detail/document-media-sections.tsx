"use client"

import { Paperclip } from "lucide-react"

import { DocumentMediaBlock } from "@/components/kanban/task-detail/document-media-block"
import { Button } from "@/components/ui/button"
import { findSectionIndex } from "@/lib/kanban/document-section-blocks"
import { cn } from "@/lib/utils"
import type {
  BusinessPlanSection,
  EvaluationSection,
} from "@/services/kanban.task-detail.types"

type MediaSection = BusinessPlanSection | EvaluationSection

type DocumentMediaSectionsProps<T extends MediaSection> = {
  sections: T[]
  readOnly?: boolean
  taskId?: string
  onSectionsChange: (next: T[]) => void
  createSectionId: () => string | number
  className?: string
}

export function DocumentMediaSections<T extends MediaSection>({
  sections,
  readOnly,
  taskId,
  onSectionsChange,
  createSectionId,
  className,
}: DocumentMediaSectionsProps<T>) {
  const mediaSections = sections.filter((section) => section.type === "file")

  const addMediaSection = () => {
    onSectionsChange([
      ...sections,
      {
        id: createSectionId(),
        type: "file",
        title: "",
        content: "",
      } as unknown as T,
    ])
  }

  const updateSection = (
    sectionId: string | number,
    patch: Partial<MediaSection>,
  ) => {
    const index = findSectionIndex(sections, sectionId)
    if (index < 0) return
    onSectionsChange(
      sections.map((section, i) =>
        i === index ? ({ ...section, ...patch } as T) : section,
      ),
    )
  }

  const removeSection = (sectionId: string | number) => {
    onSectionsChange(
      sections.filter((section) => String(section.id) !== String(sectionId)),
    )
  }

  return (
    <div className={cn("document-media-sections space-y-3", className)}>
      <div className="flex items-center justify-between gap-2 border border-b-0 border-black bg-[#f5f5f5] px-3 py-2">
        <h3 className="text-sm font-medium text-neutral-700">첨부 자료</h3>
        <p className="text-[11px] text-muted-foreground">
          PDF · 이미지 · 동영상
        </p>
      </div>

      {mediaSections.length === 0 ? (
        <div className="border border-black bg-[#fafafa] px-4 py-6 text-center text-sm text-muted-foreground">
          {readOnly
            ? "첨부된 PDF·이미지·동영상이 없습니다."
            : "아래 버튼으로 자료를 추가하세요."}
        </div>
      ) : (
        mediaSections.map((section) => (
          <DocumentMediaBlock
            key={String(section.id)}
            title={section.title}
            content={section.content}
            readOnly={readOnly}
            taskId={taskId}
            onTitleChange={(title) => updateSection(section.id, { title })}
            onContentChange={(content) =>
              updateSection(section.id, { content })
            }
            onRemove={
              readOnly ? undefined : () => removeSection(section.id)
            }
          />
        ))
      )}

      {!readOnly ? (
        <div className="print-hide flex justify-center border border-black bg-[#fafafa] px-3 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMediaSection}
          >
            <Paperclip className="mr-2 size-4" />
            PDF · 이미지 · 동영상 추가
          </Button>
        </div>
      ) : null}
    </div>
  )
}
