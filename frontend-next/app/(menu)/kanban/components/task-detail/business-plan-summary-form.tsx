"use client"

import type { ReactNode } from "react"

import {
  HwpxDocument,
  HwpxDocumentTitle,
  HwpxLabel,
  HwpxTable,
  HwpxValue,
} from "@menu/kanban/components/task-detail/hwpx-document-ui"
import {
  LineSlotGoalsInput,
  LineSlotInput,
} from "@menu/kanban/components/task-detail/line-slot-input"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PLAN_HWPX_TEMPLATE_TITLE } from "@/lib/kanban/task-reference-documents"
import type { BusinessPlanFormData } from "@/services/kanban.task-detail.types"

type BusinessPlanSummaryFormProps = {
  formData: BusinessPlanFormData
  readOnly: boolean
  onFormDataChange: (next: BusinessPlanFormData) => void
  compact?: boolean
  /** 참고 패널 — 읽기 전용 표시 */
  referenceOnly?: boolean
}

/** 참고용 사업계획서 요약 (HWPX 표) */
export function BusinessPlanSummaryForm({
  formData,
  readOnly,
  onFormDataChange,
  compact,
  referenceOnly,
}: BusinessPlanSummaryFormProps) {
  const isReadOnly = readOnly || Boolean(referenceOnly)

  const update = (patch: Partial<BusinessPlanFormData>) => {
    if (isReadOnly) return
    onFormDataChange({ ...formData, ...patch })
  }

  return (
    <HwpxDocument compact={compact}>
      <HwpxDocumentTitle>{PLAN_HWPX_TEMPLATE_TITLE}</HwpxDocumentTitle>

      <HwpxTable>
        <tbody>
          <PlanRow label="사 업 명" readOnly={isReadOnly}>
            {isReadOnly ? (
              formData.projectName || "-"
            ) : (
              <HwpxInlineInput
                value={formData.projectName}
                onChange={(projectName) => update({ projectName })}
              />
            )}
          </PlanRow>
          <PlanRow label="목 적" readOnly={isReadOnly}>
            <LineSlotInput
              value={formData.purpose}
              onChange={(purpose) => update({ purpose })}
              readOnly={isReadOnly}
              minRows={compact ? 2 : 3}
            />
          </PlanRow>
          <PlanRow label="목 표" readOnly={isReadOnly}>
            <LineSlotGoalsInput
              goals={formData.goals}
              onChange={(goals) => update({ goals })}
              readOnly={isReadOnly}
            />
          </PlanRow>
          <PlanRow
            label="사 업 기 간"
            value={formData.period}
            field="period"
            readOnly={isReadOnly}
            onUpdate={update}
          />
          <PlanRow
            label="사 업 대 상"
            value={formData.target}
            field="target"
            readOnly={isReadOnly}
            onUpdate={update}
          />
          <PlanRow
            label="연인원수/횟수"
            value={formData.totalCount}
            field="totalCount"
            readOnly={isReadOnly}
            onUpdate={update}
          />
          <PlanRow
            label="소요예산"
            value={formData.budget}
            field="budget"
            readOnly={isReadOnly}
            onUpdate={update}
          />
          <PlanRow
            label="예산과목"
            value={formData.budgetCategory}
            field="budgetCategory"
            readOnly={isReadOnly}
            onUpdate={update}
          />
          <PlanRow
            label="담당"
            value={formData.manager}
            field="manager"
            readOnly={isReadOnly}
            onUpdate={update}
          />
        </tbody>
      </HwpxTable>

      <div className="border-t border-black bg-[#ececec] px-2 py-1.5 text-center text-[0.92em] font-semibold">
        세부사업
      </div>
      <HwpxTable>
        <thead>
          <tr>
            <HwpxLabel className="w-[28%]">세부사업명</HwpxLabel>
            <HwpxLabel colSpan={1}>내용</HwpxLabel>
          </tr>
        </thead>
        <tbody>
          {formData.subProjects.map((sub, index) => (
            <tr key={`${sub.name}-${index}`}>
              <HwpxValue className="align-top font-medium">{sub.name}</HwpxValue>
              <HwpxValue className="align-top">
                <LineSlotInput
                  value={sub.output}
                  onChange={(output) => {
                    const subProjects = [...formData.subProjects]
                    subProjects[index] = { ...sub, output }
                    update({ subProjects })
                  }}
                  readOnly={isReadOnly}
                  minRows={compact ? 2 : 3}
                />
              </HwpxValue>
            </tr>
          ))}
        </tbody>
      </HwpxTable>
    </HwpxDocument>
  )
}

function PlanRow({
  label,
  children,
  value,
  field,
  readOnly,
  onUpdate,
}: {
  label: string
  children?: ReactNode
  value?: string
  field?: keyof BusinessPlanFormData
  readOnly: boolean
  onUpdate?: (patch: Partial<BusinessPlanFormData>) => void
}) {
  return (
    <tr>
      <HwpxLabel>{label}</HwpxLabel>
      <HwpxValue colSpan={3}>
        {children ??
          (readOnly || !field || !onUpdate ? (
            value || "-"
          ) : (
            <HwpxInlineInput
              value={value ?? ""}
              onChange={(v) => onUpdate({ [field]: v } as Partial<BusinessPlanFormData>)}
            />
          ))}
      </HwpxValue>
    </tr>
  )
}

function HwpxInlineInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("hwpx-inline-input w-full", className)}
    />
  )
}
