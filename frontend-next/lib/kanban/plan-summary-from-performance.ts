import type { PerformanceRow } from "@/services/kanban.performance.types"
import type { BusinessPlanFormData } from "@/services/kanban.task-detail.types"

/**
 * 재원(원천) 코드 → 표시 라벨.
 * 단일 출처: components/.../performance/performance-summary.constants 의 FUNDING_SOURCES.
 * (lib → component 의존을 피하기 위해 안정적인 회계 재원명만 여기서 보유)
 */
const FUNDING_SOURCE_LABELS: Record<string, string> = {
  경: "경상보조금",
  기: "기타보조금",
  비: "비지정후원금",
  지: "지정후원금",
  법: "법인전입금",
  사: "사업수익",
  잡: "잡수입",
}

/** 입력관리 합계에 포함하는 행(세목 미선택·빈 행 제외) — input-rows-to-summary 규칙과 동일 */
function isCountableRow(row: PerformanceRow): boolean {
  return Boolean(row.subProject) && row.subProject !== "선택"
}

/** 계획 예산의 재원 코드 — planFunding 우선, 없으면 fundingSources */
function collectPlanFundingSources(row: PerformanceRow): string[] {
  const sources = new Set<string>()
  row.planFunding?.forEach((entry) => sources.add(entry.source))
  row.fundingSources?.forEach((source) => sources.add(source))
  return [...sources]
}

export interface DerivedPlanSummary {
  /** 연인원수/횟수 */
  totalCount: string
  /** 소요예산 */
  budget: string
  /** 예산과목(재원) */
  budgetCategory: string
}

/** 실적관리 입력행의 '계획' 수치를 집계해 사업계획 요약 필드를 도출 */
export function derivePlanSummaryFromInputRows(
  rows: PerformanceRow[],
): DerivedPlanSummary {
  let people = 0
  let count = 0
  let budget = 0
  const sources = new Set<string>()

  for (const row of rows) {
    if (!isCountableRow(row)) continue

    people += row.planPeople
    count += row.planCount
    budget += row.planBudget

    if (row.planBudget > 0) {
      const rowSources = collectPlanFundingSources(row)
      if (rowSources.length === 0) {
        sources.add("비")
      } else {
        rowSources.forEach((source) => sources.add(source))
      }
    }
  }

  const budgetCategory = [...sources]
    .map((code) => {
      const label = FUNDING_SOURCE_LABELS[code]
      return label ? `${label}(${code})` : code
    })
    .join(", ")

  return {
    totalCount:
      people > 0 || count > 0
        ? `${people.toLocaleString()}명 / ${count.toLocaleString()}회`
        : "",
    budget: budget > 0 ? `금 ${budget.toLocaleString()}원` : "",
    budgetCategory,
  }
}

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

/**
 * 사업계획 요약 필드를 실적관리 도출값·담당으로 채움.
 * 비어 있는 필드만 채우고 사용자가 직접 입력한 값은 보존한다.
 */
export function fillEmptyPlanSummary(
  form: BusinessPlanFormData,
  derived: DerivedPlanSummary,
  managerLabel: string,
): BusinessPlanFormData {
  return {
    ...form,
    totalCount: isBlank(form.totalCount) ? derived.totalCount : form.totalCount,
    budget: isBlank(form.budget) ? derived.budget : form.budget,
    budgetCategory: isBlank(form.budgetCategory)
      ? derived.budgetCategory
      : form.budgetCategory,
    manager: isBlank(form.manager) ? managerLabel : form.manager,
  }
}
