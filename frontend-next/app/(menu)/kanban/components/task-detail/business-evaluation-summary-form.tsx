"use client"

import { useCallback, useEffect, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  LineSlotGoalsInput,
  LineSlotInput,
} from "@menu/kanban/components/task-detail/line-slot-input"
import {
  HwpxDocument,
  HwpxDocumentTitle,
  HwpxLabel,
  HwpxBandRow,
  HwpxTable,
  HwpxValue,
} from "@menu/kanban/components/task-detail/hwpx-document-ui"
import { useRichTextToolbarOptional } from "@menu/kanban/components/task-detail/rich-text-toolbar-context"
import { cn } from "@/lib/utils"
import type { BusinessEvaluationData } from "@/services/kanban.task-detail.types"

const SUMMARY_FIELD_BLOCKS: [string, string][] = [
  ["eval-team", "사업팀"],
  ["eval-manager", "담당자"],
  ["eval-period", "사업기간"],
  ["eval-program", "프로그램명"],
  ["eval-target", "대상"],
  ["eval-purpose", "목적"],
  ["eval-goals", "목표"],
  ["eval-performance", "성과지표"],
  ["eval-tool", "평가도구"],
  ["eval-key-factor", "성과 주요 요인 분석"],
  ["eval-goal-appropriacy", "목표 적절성"],
  ["eval-suggestion", "제언 및 향후 계획"],
  ["eval-supervision", "슈퍼비전"],
  ["eval-evaluation-date", "평가일"],
]

function buildEvaluationTitle(
  programName: string | undefined,
  businessName?: string,
): string {
  const name =
    programName?.trim() || businessName?.trim() || "사업이름"
  return `${name} 최종사업평가서`
}

function useSummaryFieldBlocks() {
  const ctx = useRichTextToolbarOptional()

  useEffect(() => {
    if (!ctx) return
    for (const [id, label] of SUMMARY_FIELD_BLOCKS) {
      ctx.registerFieldBlock(id, label)
    }
  }, [ctx])

  return useCallback(
    (id: string) => () => {
      ctx?.activateFieldBlock(id)
    },
    [ctx],
  )
}

type BusinessEvaluationSummaryFormProps = {
  evaluation: BusinessEvaluationData
  canEdit: boolean
  datePickerOpen: boolean
  onDatePickerOpenChange: (open: boolean) => void
  onEvaluationChange: Dispatch<SetStateAction<BusinessEvaluationData>>
  /** 사업계획서 사업명 — 프로그램명 비어 있을 때 제목에 사용 */
  businessName?: string
}

function displayOrDash(value: string | undefined): string {
  return value?.trim() ? value : "-"
}

/** 최종사업평가서 요약 (HWPX 공문 표 레이아웃) */
export function BusinessEvaluationSummaryForm({
  evaluation,
  canEdit,
  datePickerOpen,
  onDatePickerOpenChange,
  onEvaluationChange,
  businessName,
}: BusinessEvaluationSummaryFormProps) {
  const activateBlock = useSummaryFieldBlocks()
  const evaluationDateValue = evaluation.evaluationDate
    ? parseISO(evaluation.evaluationDate)
    : undefined

  const update = (patch: Partial<BusinessEvaluationData>) => {
    onEvaluationChange((prev) => ({ ...prev, ...patch }))
  }

  const supervisionReadOnly = canEdit
  const titleText = buildEvaluationTitle(
    evaluation.programName,
    businessName,
  )

  return (
    <HwpxDocument className="evaluation-summary-form">
      <HwpxDocumentTitle>{titleText}</HwpxDocumentTitle>

      {canEdit ? (
        <p className="print-hide border-b border-black/15 bg-[#fafafa] px-4 py-2 text-center text-[11px] text-neutral-600">
          표 칸을 클릭하면 좌측 서식 툴바가 연결됩니다. 본문(고급 서식)은 「추가 본문」에서
          이어서 작성할 수 있습니다.
        </p>
      ) : null}

      <HwpxTable>
        <tbody>
          <tr>
            <HwpxLabel>사업팀</HwpxLabel>
            <HwpxValue>
              {canEdit ? (
                <HwpxInlineInput
                  value={evaluation.team}
                  onChange={(team) => update({ team })}
                  onFocus={activateBlock("eval-team")}
                />
              ) : (
                displayOrDash(evaluation.team)
              )}
            </HwpxValue>
            <HwpxLabel>담당자</HwpxLabel>
            <HwpxValue>
              {canEdit ? (
                <HwpxInlineInput
                  value={evaluation.manager}
                  onChange={(manager) => update({ manager })}
                  onFocus={activateBlock("eval-manager")}
                />
              ) : (
                displayOrDash(evaluation.manager)
              )}
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel>사업기간</HwpxLabel>
            <HwpxValue>
              {canEdit ? (
                <HwpxInlineInput
                  value={evaluation.period}
                  onChange={(period) => update({ period })}
                  onFocus={activateBlock("eval-period")}
                />
              ) : (
                displayOrDash(evaluation.period)
              )}
            </HwpxValue>
            <HwpxLabel>평가일</HwpxLabel>
            <HwpxValue>
              <span className="print-only print-inline">
                {evaluation.evaluationDate
                  ? format(parseISO(evaluation.evaluationDate), "yyyy년 MM월 dd일", {
                      locale: ko,
                    })
                  : "-"}
              </span>
              <div className="print-hide">
                <Popover
                  open={datePickerOpen}
                  onOpenChange={onDatePickerOpenChange}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canEdit}
                      onFocus={activateBlock("eval-evaluation-date")}
                      className={cn(
                        "h-9 w-full justify-start border-black/30 bg-white px-2 font-normal",
                        !evaluation.evaluationDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
                      {evaluation.evaluationDate
                        ? format(
                            parseISO(evaluation.evaluationDate),
                            "yyyy년 MM월 dd일",
                            { locale: ko },
                          )
                        : "연도-월-일"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={evaluationDateValue}
                      onSelect={(date) => {
                        if (!date) return
                        update({
                          evaluationDate: format(date, "yyyy-MM-dd"),
                        })
                        onDatePickerOpenChange(false)
                      }}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel>프로그램명</HwpxLabel>
            <HwpxValue>
              {canEdit ? (
                <HwpxInlineInput
                  value={evaluation.programName}
                  onChange={(programName) => update({ programName })}
                  onFocus={activateBlock("eval-program")}
                />
              ) : (
                displayOrDash(evaluation.programName)
              )}
            </HwpxValue>
            <HwpxLabel>대상</HwpxLabel>
            <HwpxValue>
              {canEdit ? (
                <HwpxInlineInput
                  value={evaluation.target}
                  onChange={(target) => update({ target })}
                  onFocus={activateBlock("eval-target")}
                />
              ) : (
                displayOrDash(evaluation.target)
              )}
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel>
              계획
              <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                인원(명/회)
              </span>
            </HwpxLabel>
            <HwpxValue>
              <PerformanceLinkedValue
                value={evaluation.planCount}
                showHint={canEdit}
              />
            </HwpxValue>
            <HwpxLabel>예산(원)</HwpxLabel>
            <HwpxValue align="right">
              <PerformanceLinkedValue
                value={evaluation.planBudget}
                showHint={canEdit}
                align="right"
              />
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel>
              실행
              <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                인원(명/회)
              </span>
            </HwpxLabel>
            <HwpxValue>
              <PerformanceLinkedValue
                value={evaluation.actualCount}
                showHint={canEdit}
              />
            </HwpxValue>
            <HwpxLabel>지출(원)</HwpxLabel>
            <HwpxValue align="right">
              <PerformanceLinkedValue
                value={evaluation.actualExpense}
                showHint={canEdit}
                align="right"
              />
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel className="align-top">목적</HwpxLabel>
            <HwpxValue className="align-top">
              <LineSlotInput
                value={evaluation.purpose}
                onChange={(purpose) => update({ purpose })}
                readOnly={!canEdit}
                minRows={2}
                onFocus={activateBlock("eval-purpose")}
              />
            </HwpxValue>
            <HwpxLabel className="align-top">목표</HwpxLabel>
            <HwpxValue className="align-top">
              <LineSlotGoalsInput
                goals={evaluation.goals}
                onChange={(goals) => update({ goals })}
                readOnly={!canEdit}
                onFocus={activateBlock("eval-goals")}
              />
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel className="align-top">성과지표</HwpxLabel>
            <HwpxValue className="align-top">
              <LineSlotInput
                value={evaluation.performanceIndicator}
                onChange={(performanceIndicator) =>
                  update({ performanceIndicator })
                }
                readOnly={!canEdit}
                minRows={2}
                onFocus={activateBlock("eval-performance")}
              />
            </HwpxValue>
            <HwpxLabel className="align-top">평가도구</HwpxLabel>
            <HwpxValue className="align-top">
              <LineSlotInput
                value={evaluation.evaluationTool}
                onChange={(evaluationTool) => update({ evaluationTool })}
                readOnly={!canEdit}
                minRows={2}
                onFocus={activateBlock("eval-tool")}
              />
            </HwpxValue>
          </tr>

          <tr>
            <HwpxLabel rowSpan={3} className="align-middle">
              프로그램
              <br />
              평가
            </HwpxLabel>
            <HwpxLabel sub>성과 주요 요인 분석</HwpxLabel>
            <HwpxValue colSpan={2} className="align-top">
              <LineSlotInput
                value={evaluation.keyFactorAnalysis}
                onChange={(keyFactorAnalysis) =>
                  update({ keyFactorAnalysis })
                }
                readOnly={!canEdit}
                minRows={2}
                onFocus={activateBlock("eval-key-factor")}
              />
            </HwpxValue>
          </tr>
          <tr>
            <HwpxLabel sub>목표 적절성</HwpxLabel>
            <HwpxValue colSpan={2} className="align-top">
              <LineSlotInput
                value={evaluation.goalAppropriacy}
                onChange={(goalAppropriacy) => update({ goalAppropriacy })}
                readOnly={!canEdit}
                minRows={2}
                onFocus={activateBlock("eval-goal-appropriacy")}
              />
            </HwpxValue>
          </tr>
          <tr>
            <HwpxLabel sub>제언 및 향후 계획</HwpxLabel>
            <HwpxValue colSpan={2} className="align-top">
              <LineSlotInput
                value={evaluation.suggestion}
                onChange={(suggestion) => update({ suggestion })}
                readOnly={!canEdit}
                minRows={2}
                onFocus={activateBlock("eval-suggestion")}
              />
            </HwpxValue>
          </tr>

          <HwpxBandRow>슈퍼비전</HwpxBandRow>
          <tr>
            <HwpxValue colSpan={4} className="align-top">
              <LineSlotInput
                value={evaluation.supervision}
                onChange={(supervision) => update({ supervision })}
                readOnly={supervisionReadOnly}
                minRows={2}
                onFocus={activateBlock("eval-supervision")}
              />
              <p className="mt-2 text-[11px] text-neutral-600 print-hide">
                {!canEdit
                  ? "슈퍼비전을 입력·수정할 수 있습니다."
                  : "슈퍼비전은 사업평가 완료 후(보기 모드)에 입력합니다."}
              </p>
            </HwpxValue>
          </tr>
        </tbody>
      </HwpxTable>
    </HwpxDocument>
  )
}

/** 실적관리에서 자동 반영되는 읽기전용 값 (계획/실행 인원·예산·지출) */
function PerformanceLinkedValue({
  value,
  showHint,
  align,
}: {
  value: string
  /** 편집 모드에서 "실적관리 자동 반영" 안내 노출 */
  showHint: boolean
  align?: "right"
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "right" ? "items-end" : "items-start",
      )}
    >
      <span>{displayOrDash(value)}</span>
      {showHint ? (
        <span className="print-hide text-[10px] font-normal text-neutral-500">
          실적관리 자동 반영
        </span>
      ) : null}
    </div>
  )
}

function HwpxInlineInput({
  value,
  onChange,
  onFocus,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  className?: string
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      className={cn("hwpx-inline-input w-full", className)}
    />
  )
}
