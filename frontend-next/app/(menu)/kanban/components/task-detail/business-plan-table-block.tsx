"use client"

import {
  Columns,
  LayoutGrid,
  Plus,
  Rows,
  Target,
  Trash2,
} from "lucide-react"

import { HwpxContentBlock } from "@menu/kanban/components/task-detail/hwpx-document-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  addCustomTableColumn,
  addCustomTableRow,
  parseTableSectionContent,
  removeCustomTableColumn,
  removeCustomTableRow,
  serializeTableSectionContent,
  setCustomTableHeaderRowCount,
  updateCustomTableCell,
  type BusinessPlanCustomTableData,
  type BusinessPlanTableSectionData,
} from "@/lib/business-plan-table-utils"
import { formatLineSlotText, parseLineSlots } from "@/lib/line-slot-utils"
import {
  computeOutcomeRowSpans,
  splitSubProjectOutput,
} from "@/lib/sub-project-output-format"
import type {
  BusinessPlanFormData,
  BusinessPlanSection,
  BusinessPlanSubProject,
} from "@/services/kanban.task-detail.types"

type BusinessPlanTableBlockProps = {
  section: BusinessPlanSection
  formData: BusinessPlanFormData
  readOnly: boolean
  onSectionChange: (patch: Partial<BusinessPlanSection>) => void
  onFormDataChange: (next: BusinessPlanFormData) => void
}

export function BusinessPlanTableBlock({
  section,
  formData,
  readOnly,
  onSectionChange,
  onFormDataChange,
}: BusinessPlanTableBlockProps) {
  const tableData = parseTableSectionContent(section.content)

  const saveTableData = (next: BusinessPlanTableSectionData) => {
    onSectionChange({ content: serializeTableSectionContent(next) })
  }

  const blockLabel = section.title?.trim() || "표"

  return (
    <HwpxContentBlock
      label={blockLabel}
      toolbar={
        !readOnly ? (
          <TableBlockToolbar
            preset={tableData.preset}
            onPresetChange={(preset) => {
              if (preset === "purpose-goals") {
                saveTableData({ preset: "purpose-goals" })
              } else {
                saveTableData({
                  preset: "custom",
                  rows: [
                    ["열1", "열2", "열3"],
                    ["", "", ""],
                    ["", "", ""],
                  ],
                  headerRowCount: 1,
                })
              }
            }}
            customData={tableData.preset === "custom" ? tableData : null}
            onCustomChange={saveTableData}
          />
        ) : undefined
      }
    >
      <div className="space-y-3">
        {!readOnly ? (
          <Input
            value={section.title}
            onChange={(e) => onSectionChange({ title: e.target.value })}
            placeholder="표 제목 (왼쪽 라벨에 반영)"
            className="hwpx-inline-input max-w-md font-medium"
          />
        ) : null}

        {tableData.preset === "purpose-goals" ? (
          <PurposeGoalsTable
            formData={formData}
            readOnly={readOnly}
            onFormDataChange={onFormDataChange}
          />
        ) : (
          <CustomEditableTable
            data={tableData}
            readOnly={readOnly}
            onChange={(next) => saveTableData(next)}
          />
        )}
      </div>
    </HwpxContentBlock>
  )
}

function TableBlockToolbar({
  preset,
  onPresetChange,
  customData,
  onCustomChange,
}: {
  preset: BusinessPlanTableSectionData["preset"]
  onPresetChange: (preset: BusinessPlanTableSectionData["preset"]) => void
  customData: BusinessPlanCustomTableData | null
  onCustomChange: (data: BusinessPlanTableSectionData) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-slate-50/90 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">표 편집</span>
      <div className="flex rounded-md border border-gray-200 bg-white p-0.5">
        <Button
          type="button"
          size="sm"
          variant={preset === "purpose-goals" ? "secondary" : "ghost"}
          className="h-7 gap-1 text-xs"
          onClick={() => onPresetChange("purpose-goals")}
        >
          <Target className="size-3.5" />
          목적·목표
        </Button>
        <Button
          type="button"
          size="sm"
          variant={preset === "custom" ? "secondary" : "ghost"}
          className="h-7 gap-1 text-xs"
          onClick={() => onPresetChange("custom")}
        >
          <LayoutGrid className="size-3.5" />
          자유 표
        </Button>
      </div>

      {preset === "custom" && customData ? (
        <>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => onCustomChange(addCustomTableRow(customData))}
          >
            <Plus className="size-3.5" />
            행 추가
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={customData.rows.length <= 1}
            onClick={() => {
              const next = removeCustomTableRow(
                customData,
                customData.rows.length - 1,
              )
              if (next) onCustomChange(next)
            }}
          >
            <Trash2 className="size-3.5" />
            마지막 행 삭제
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => onCustomChange(addCustomTableColumn(customData))}
          >
            <Columns className="size-3.5" />
            열 추가
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={(customData.rows[0]?.length ?? 0) <= 1}
            onClick={() => {
              const col = (customData.rows[0]?.length ?? 1) - 1
              const next = removeCustomTableColumn(customData, col)
              if (next) onCustomChange(next)
            }}
          >
            <Trash2 className="size-3.5" />
            마지막 열 삭제
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={customData.headerRowCount >= customData.rows.length}
            onClick={() =>
              onCustomChange(
                setCustomTableHeaderRowCount(
                  customData,
                  customData.headerRowCount + 1,
                ),
              )
            }
          >
            <Rows className="size-3.5" />
            헤더 행 +
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={customData.headerRowCount <= 0}
            onClick={() =>
              onCustomChange(
                setCustomTableHeaderRowCount(
                  customData,
                  customData.headerRowCount - 1,
                ),
              )
            }
          >
            헤더 행 −
          </Button>
        </>
      ) : null}
    </div>
  )
}

function PurposeGoalsTable({
  formData,
  readOnly,
  onFormDataChange,
}: {
  formData: BusinessPlanFormData
  readOnly: boolean
  onFormDataChange: (next: BusinessPlanFormData) => void
}) {
  const purposeText = formatLineSlotText(
    parseLineSlots(formData.purpose).join("\n") || formData.purpose,
  )

  const updateSubProjects = (next: BusinessPlanSubProject[]) => {
    onFormDataChange({ ...formData, subProjects: next })
  }

  const addSubProjectRow = () => {
    updateSubProjects([
      ...formData.subProjects,
      { name: `세부사업 ${formData.subProjects.length + 1}`, output: "", outcome: "" },
    ])
  }

  const removeSubProjectRow = (index: number) => {
    if (formData.subProjects.length <= 1) return
    updateSubProjects(formData.subProjects.filter((_, i) => i !== index))
  }

  const outcomeSpans = computeOutcomeRowSpans(formData.subProjects)

  return (
    <div className="space-y-2">
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={addSubProjectRow}
          >
            <Plus className="size-3.5" />
            세부사업 행 추가
          </Button>
          <span className="self-center text-[11px] text-muted-foreground">
            각 행의 삭제는 행 끝 버튼 사용
          </span>
        </div>
      ) : null}

      <table className="hwpx-doc__table hwpx-goals-table w-full text-[10px]">
        <thead>
          <tr>
            <th className="hwpx-doc__label" rowSpan={2}>
              목적
            </th>
            <th className="hwpx-doc__label" colSpan={2}>
              목표
            </th>
            {!readOnly ? (
              <th className="w-10 print-hide" rowSpan={2} />
            ) : null}
          </tr>
          <tr>
            <th className="hwpx-doc__sublabel">산출목표</th>
            <th className="hwpx-doc__sublabel">성과목표</th>
          </tr>
        </thead>
        <tbody>
          {formData.subProjects.map((subProject, subIndex) => {
            const outcomeSpan = outcomeSpans[subIndex] ?? 1
            const parsed = splitSubProjectOutput(
              subProject.name,
              subProject.output,
            )

            return (
              <tr key={`${subProject.name}-${subIndex}`}>
                {subIndex === 0 && (
                  <td
                    className="align-top"
                    rowSpan={formData.subProjects.length}
                  >
                    {readOnly ? (
                      <span className="whitespace-pre-line leading-relaxed">
                        {purposeText}
                      </span>
                    ) : (
                      <Textarea
                        value={formData.purpose}
                        onChange={(e) =>
                          onFormDataChange({
                            ...formData,
                            purpose: e.target.value,
                          })
                        }
                        className="min-h-[140px] resize-y text-[10px] leading-relaxed"
                      />
                    )}
                  </td>
                )}
                <td className="align-top">
                  {readOnly ? (
                    <GoalOutputView parsed={parsed} />
                  ) : (
                    <GoalOutputEditor
                      name={subProject.name}
                      output={subProject.output}
                      onChange={(patch) => {
                        const next = [...formData.subProjects]
                        next[subIndex] = { ...next[subIndex], ...patch }
                        updateSubProjects(next)
                      }}
                    />
                  )}
                </td>
                {outcomeSpan > 0 ? (
                  <td className="align-top" rowSpan={outcomeSpan}>
                    {readOnly ? (
                      <span className="whitespace-pre-line leading-relaxed">
                        {subProject.outcome}
                      </span>
                    ) : (
                      <Textarea
                        value={subProject.outcome}
                        onChange={(e) => {
                          const next = [...formData.subProjects]
                          next[subIndex] = {
                            ...next[subIndex],
                            outcome: e.target.value,
                          }
                          updateSubProjects(next)
                        }}
                        className="min-h-[80px] resize-y text-[10px] leading-relaxed"
                        placeholder="성과목표 (같은 내용이면 아래 행과 자동 병합)"
                      />
                    )}
                  </td>
                ) : null}
                {!readOnly ? (
                  <td className="w-10 align-middle print-hide">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-destructive hover:text-destructive"
                      disabled={formData.subProjects.length <= 1}
                      title="이 세부사업 행 삭제"
                      onClick={() => removeSubProjectRow(subIndex)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GoalOutputView({
  parsed,
}: {
  parsed: ReturnType<typeof splitSubProjectOutput>
}) {
  return (
    <div className="space-y-1 leading-relaxed">
      <p className="font-semibold text-[#111]">{parsed.title}</p>
      {parsed.headline && parsed.headline !== parsed.title ? (
        <p className="text-[11pt]">{parsed.headline}</p>
      ) : null}
      {parsed.bullets.length > 0 ? (
        <ul className="doc-goal-list ml-0 list-none pl-0">
          {parsed.bullets.map((line, i) => (
            <li key={i} className="relative pl-3 before:absolute before:left-0 before:content-['-']">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function GoalOutputEditor({
  name,
  output,
  onChange,
}: {
  name: string
  output: string
  onChange: (patch: { name?: string; output?: string }) => void
}) {
  const parsed = splitSubProjectOutput(name, output)
  const bulletText = parsed.bullets.join("\n")

  return (
    <div className="space-y-2">
      <Input
        value={name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="세부사업명 (굵게 표시)"
        className="hwpx-inline-input font-semibold"
      />
      <Textarea
        value={bulletText}
        onChange={(e) => {
          const bullets = e.target.value
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
          const headline =
            parsed.headline ||
            `${name.trim()} (인원 / 횟수)`
          const lines = [headline, ...bullets.map((b) => `- ${b}`)]
          onChange({ output: lines.join("\n") })
        }}
        placeholder={"- 상반기 80명×6개월=480명 / 480회\n- 하반기 ..."}
        className="min-h-[88px] resize-y text-[10px] leading-relaxed"
      />
      <p className="text-[10px] text-muted-foreground">
        첫 줄은 요약(인원/횟수), 아래는 `-` 로 시작하는 산출 근거
      </p>
    </div>
  )
}

function CustomEditableTable({
  data,
  readOnly,
  onChange,
}: {
  data: BusinessPlanCustomTableData
  readOnly: boolean
  onChange: (next: BusinessPlanCustomTableData) => void
}) {
  const colCount = data.rows[0]?.length ?? 1

  return (
    <div className="overflow-x-auto">
      <table className="hwpx-doc__table w-full min-w-[320px] text-sm">
        <tbody>
          {data.rows.map((row, rowIndex) => {
            const isHeader = rowIndex < data.headerRowCount
            return (
              <tr
                key={rowIndex}
                className={isHeader ? "bg-slate-50" : undefined}
              >
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="p-1 align-top"
                  >
                    {readOnly ? (
                      <span className="block whitespace-pre-line px-2 py-1.5">
                        {cell || " "}
                      </span>
                    ) : (
                      <Textarea
                        value={cell}
                        onChange={(e) =>
                          onChange(
                            updateCustomTableCell(
                              data,
                              rowIndex,
                              colIndex,
                              e.target.value,
                            ),
                          )
                        }
                        rows={isHeader ? 1 : 2}
                        className={
                          isHeader
                            ? "min-h-0 resize-none border-0 bg-transparent text-center text-xs font-semibold shadow-none focus-visible:ring-1"
                            : "min-h-[48px] resize-y border-gray-100 bg-white text-sm shadow-none focus-visible:ring-1"
                        }
                      />
                    )}
                  </td>
                ))}
                {!readOnly ? (
                  <td className="w-10 border border-gray-300 px-1 align-middle print-hide">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-destructive hover:text-destructive"
                      disabled={data.rows.length <= 1}
                      title="행 삭제"
                      onClick={() => {
                        const next = removeCustomTableRow(data, rowIndex)
                        if (next) onChange(next)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
      {!readOnly ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {colCount}열 · {data.rows.length}행 (헤더 {data.headerRowCount}행)
        </p>
      ) : null}
    </div>
  )
}
