"use client"

import { AddDocumentBlocksBar } from "@/components/kanban/task-detail/add-document-blocks-bar"
import { BusinessPlanRichText } from "@/components/kanban/task-detail/business-plan-rich-text"
import { DocumentSectionControls } from "@/components/kanban/task-detail/document-section-controls"
import {
  HwpxLabel,
  HwpxTable,
  HwpxTextarea,
  HwpxValue,
} from "@/components/kanban/task-detail/hwpx-document-ui"
import { Input } from "@/components/ui/input"
import {
  deleteRowFromSections,
  moveRowGroupInSections,
  rowsFromDocumentSections,
  type DocumentSection,
  type DocumentSectionRow,
} from "@/lib/kanban/document-section-blocks"
import { cn } from "@/lib/utils"

const SECTION_COLGROUP = (
  <colgroup>
    <col className="w-[6.5rem]" />
    <col />
    <col className="w-[2.75rem]" />
  </colgroup>
)

type DocumentSectionsTableProps = {
  sections: DocumentSection[]
  readOnly?: boolean
  onHeadingChange: (sectionId: string, title: string) => void
  onBodyChange: (
    sectionId: string,
    patch: { title?: string; content?: string },
  ) => void
  onSectionsChange?: (next: DocumentSection[]) => void
  onAddHeading?: () => void
  onAddBody?: () => void
  className?: string
}

function groupRowSpan(
  rowIndex: number,
  boundaries: number[],
  totalRows: number,
): number {
  const boundaryIdx = boundaries.indexOf(rowIndex)
  if (boundaryIdx < 0) return 0
  const nextStart = boundaries[boundaryIdx + 1] ?? totalRows
  return nextStart - rowIndex
}

/** sections 순서대로 대목차·목차·본문 행을 가변 렌더 (본문만 추가 시 목차+본문 2행) */
export function DocumentSectionsTable({
  sections,
  readOnly,
  onHeadingChange,
  onBodyChange,
  onSectionsChange,
  onAddHeading,
  onAddBody,
  className,
}: DocumentSectionsTableProps) {
  const rows = rowsFromDocumentSections(sections)
  const showAddBar =
    !readOnly && onAddHeading && onAddBody && onSectionsChange
  const showSideControls = !readOnly && Boolean(onSectionsChange)

  const groupBoundaries = rows
    .map((row, index) =>
      row.kind === "heading" || row.kind === "toc" ? index : -1,
    )
    .filter((index) => index >= 0)

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "print-hide flex items-center justify-between gap-2 border border-black bg-[#fafafa] px-3 py-2",
          className,
        )}
      >
        <p className="text-[11px] text-muted-foreground">
          대목차·목차·본문 블록을 추가하세요.
        </p>
        {showAddBar ? (
          <AddDocumentBlocksBar
            variant="compact"
            onAddHeading={onAddHeading}
            onAddBody={onAddBody}
          />
        ) : null}
      </div>
    )
  }

  const addBar = showAddBar ? (
    <div className="print-hide flex items-center justify-end border border-b-0 border-black bg-[#fafafa] px-2 py-0.5">
      <AddDocumentBlocksBar
        variant="compact"
        onAddHeading={onAddHeading}
        onAddBody={onAddBody}
        sectionCount={sections.length}
        bodyCount={sections.filter((s) => s.type === "body").length}
      />
    </div>
  ) : null

  return (
    <div className={cn("space-y-0 border-x border-black", className)}>
      {addBar}

      <HwpxTable className="table-fixed w-full border-t border-black">
        {SECTION_COLGROUP}
        <tbody>
          {rows.map((row, rowIndex) => {
            const groupStart = groupBoundaries.reduce(
              (best, start) => (start <= rowIndex ? start : best),
              0,
            )
            const isGroupStart =
              row.kind === "heading" || row.kind === "toc"
            const showControls =
              showSideControls && isGroupStart && rowIndex === groupStart
            const rowSpan = showControls
              ? groupRowSpan(rowIndex, groupBoundaries, rows.length)
              : 0

            return (
              <DocumentSectionRowView
                key={`${row.kind}-${row.headingSectionId ?? row.bodySectionId}`}
                row={row}
                readOnly={readOnly}
                onHeadingChange={onHeadingChange}
                onBodyChange={onBodyChange}
                showControls={showControls}
                controlRowSpan={rowSpan}
                onDelete={
                  onSectionsChange
                    ? () => onSectionsChange(deleteRowFromSections(sections, row))
                    : undefined
                }
                onMoveUp={
                  onSectionsChange
                    ? () =>
                        onSectionsChange(
                          moveRowGroupInSections(sections, rowIndex, "up"),
                        )
                    : undefined
                }
                onMoveDown={
                  onSectionsChange
                    ? () =>
                        onSectionsChange(
                          moveRowGroupInSections(sections, rowIndex, "down"),
                        )
                    : undefined
                }
              />
            )
          })}
        </tbody>
      </HwpxTable>
      {showAddBar ? (
        <div className="print-hide flex items-center justify-end border border-t-0 border-black bg-[#fafafa] px-2 py-1">
          <AddDocumentBlocksBar
            variant="compact"
            onAddHeading={onAddHeading}
            onAddBody={onAddBody}
            sectionCount={sections.length}
            bodyCount={sections.filter((s) => s.type === "body").length}
          />
        </div>
      ) : null}
    </div>
  )
}

function DocumentSectionRowView({
  row,
  readOnly,
  onHeadingChange,
  onBodyChange,
  showControls,
  controlRowSpan,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  row: DocumentSectionRow
  readOnly?: boolean
  onHeadingChange: (sectionId: string, title: string) => void
  onBodyChange: (
    sectionId: string,
    patch: { title?: string; content?: string },
  ) => void
  showControls?: boolean
  controlRowSpan?: number
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <tr>
      <HwpxLabel
        className={row.kind === "body" ? "align-top" : "align-middle"}
      >
        {row.label}
      </HwpxLabel>
      <HwpxValue className={row.kind === "body" ? "align-top" : undefined}>
        {row.kind === "heading" && row.headingSectionId ? (
          readOnly ? (
            <span className="block text-base font-semibold leading-relaxed">
              {row.value || "-"}
            </span>
          ) : (
            <Input
              value={row.value}
              onChange={(e) =>
                onHeadingChange(row.headingSectionId!, e.target.value)
              }
              data-bp-section-id={String(row.headingSectionId)}
              data-bp-section-field="title"
              className="hwpx-inline-input w-full text-base font-semibold"
              placeholder="대목차 제목"
            />
          )
        ) : null}

        {row.kind === "toc" && row.bodySectionId ? (
          readOnly ? (
            <span className="block font-semibold leading-relaxed">
              {row.value || "-"}
            </span>
          ) : (
            <HwpxTextarea
              value={row.value}
              onChange={(title) => onBodyChange(row.bodySectionId!, { title })}
              readOnly={readOnly}
              rows={2}
              className="font-semibold"
              placeholder="목차 제목을 입력하세요"
              sectionId={row.bodySectionId}
              sectionField="title"
            />
          )
        ) : null}

        {row.kind === "body" && row.bodySectionId ? (
          <BusinessPlanRichText
            value={row.htmlValue ?? row.value}
            onChange={(content) =>
              onBodyChange(row.bodySectionId!, { content })
            }
            readOnly={readOnly}
            variant="full"
            inlineToolbar
            minHeight={280}
            sectionId={row.bodySectionId}
          />
        ) : null}
      </HwpxValue>
      {showControls ? (
        <td
          rowSpan={controlRowSpan}
          className="print-hide w-[2.75rem] border border-black bg-[#fafafa] align-top p-0"
        >
          <DocumentSectionControls
            layout="side"
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
            className="mx-auto"
          />
        </td>
      ) : null}
    </tr>
  )
}
