"use client"

import { AddDocumentBlocksBar } from "@menu/kanban/components/task-detail/add-document-blocks-bar"
import { BusinessPlanRichText } from "@menu/kanban/components/task-detail/business-plan-rich-text"
import { DocumentSectionControls } from "@menu/kanban/components/task-detail/document-section-controls"
import {
  HwpxLabel,
  HwpxTable,
  HwpxTextarea,
  HwpxValue,
} from "@menu/kanban/components/task-detail/hwpx-document-ui"
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

type DocumentSectionsTableProps<T extends DocumentSection> = {
  sections: T[]
  readOnly?: boolean
  onHeadingChange: (sectionId: string, title: string) => void
  onBodyChange: (
    sectionId: string,
    patch: { title?: string; content?: string },
  ) => void
  onSectionsChange?: (next: T[]) => void
  onAddHeading?: () => void
  onAddBody?: () => void
  className?: string
}

/** sections 순서대로 대목차·본문 행을 가변 렌더 ('제목'(목차) 행은 숨김) */
export function DocumentSectionsTable<T extends DocumentSection>({
  sections,
  readOnly,
  onHeadingChange,
  onBodyChange,
  onSectionsChange,
  onAddHeading,
  onAddBody,
  className,
}: DocumentSectionsTableProps<T>) {
  const allRows = rowsFromDocumentSections(sections)
  const showAddBar =
    !readOnly && onAddHeading && onAddBody && onSectionsChange
  const showSideControls = !readOnly && Boolean(onSectionsChange)

  // "제목"(목차) 행은 노출하지 않는다 — 대목차·본문만 표시한다.
  // (section.title 데이터는 유지하되 편집 행만 숨긴다)
  const isHiddenRow = (row: DocumentSectionRow) => row.kind === "toc"

  // 대목차(heading) 또는 목차(toc)에서 그룹이 시작된다.
  // 그룹별로 시작 행(이동·삭제 기준)과 표시 행(숨김 제외)을 함께 보관한다.
  const groups: Array<{
    startFullIndex: number
    startRow: DocumentSectionRow
    visibleRows: DocumentSectionRow[]
  }> = []
  allRows.forEach((row, index) => {
    const isStart = row.kind === "heading" || row.kind === "toc"
    if (isStart || groups.length === 0) {
      groups.push({ startFullIndex: index, startRow: row, visibleRows: [] })
    }
    if (!isHiddenRow(row)) {
      groups[groups.length - 1].visibleRows.push(row)
    }
  })

  const hasVisibleRows = groups.some((group) => group.visibleRows.length > 0)

  if (!hasVisibleRows) {
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
    <div
      className={cn(
        "document-sections-table space-y-0 border-x border-black",
        className,
      )}
    >
      {addBar}

      <HwpxTable className="table-fixed w-full border-t border-black">
        {SECTION_COLGROUP}
        <tbody>
          {groups.flatMap((group) =>
            group.visibleRows.map((row, visibleIndex) => {
              const showControls = showSideControls && visibleIndex === 0
              const rowSpan = showControls ? group.visibleRows.length : 0

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
                      ? () =>
                          onSectionsChange(
                            deleteRowFromSections(sections, group.startRow),
                          )
                      : undefined
                  }
                  onMoveUp={
                    onSectionsChange
                      ? () =>
                          onSectionsChange(
                            moveRowGroupInSections(
                              sections,
                              group.startFullIndex,
                              "up",
                            ),
                          )
                      : undefined
                  }
                  onMoveDown={
                    onSectionsChange
                      ? () =>
                          onSectionsChange(
                            moveRowGroupInSections(
                              sections,
                              group.startFullIndex,
                              "down",
                            ),
                          )
                      : undefined
                  }
                />
              )
            }),
          )}
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
