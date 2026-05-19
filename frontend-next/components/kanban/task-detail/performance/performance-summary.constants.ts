import type { PerformanceFundingSource } from "@/services/kanban.performance.types"

export type PerformanceSummaryVariant = "plan" | "actual" | "result"

export type PerformanceViewMode = "subProject" | "detail"

export type FundingSourceCode = PerformanceFundingSource

export type FundingSourceOption = {
  value: FundingSourceCode | "all"
  label: string
  code: string
}

export const FUNDING_SOURCES: FundingSourceOption[] = [
  { value: "all", label: "전체", code: "전체" },
  { value: "경", label: "경상보조금", code: "경" },
  { value: "기", label: "기타보조금", code: "기" },
  { value: "비", label: "비지정후원금", code: "비" },
  { value: "지", label: "지정후원금", code: "지" },
  { value: "법", label: "법인전입금", code: "법" },
  { value: "사", label: "사업수익", code: "사" },
  { value: "잡", label: "잡수입", code: "잡" },
]

/** 입력관리 원천 선택 목록 (전체 제외) */
export const SELECTABLE_FUNDING_SOURCES = FUNDING_SOURCES.filter(
  (source) => source.value !== "all",
) as Array<FundingSourceOption & { value: FundingSourceCode }>

export const FUNDING_SOURCE_COLORS: Record<FundingSourceCode, string> = {
  경: "bg-slate-500",
  기: "bg-emerald-500",
  비: "bg-amber-500",
  지: "bg-sky-500",
  법: "bg-orange-500",
  사: "bg-cyan-500",
  잡: "bg-violet-500",
}

export const VIEW_TOOLTIPS: Record<PerformanceSummaryVariant, string> = {
  plan: "계획/실적 입력관리와 동일한 데이터의 계획(인원·횟수·예산)을 집계합니다.",
  actual: "계획/실적 입력관리와 동일한 데이터의 실적(인원·횟수·지출)을 집계합니다.",
  result: "계획/실적 입력관리와 동일한 데이터로 계획 대비 실적 진행률을 표시합니다.",
}

export const VIEW_TITLES: Record<PerformanceSummaryVariant, string> = {
  plan: "사업계획",
  actual: "사업실적",
  result: "사업결과",
}

export const MONTH_OPTIONS = [
  "전체",
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
] as const

export const DISPLAY_MONTHS = MONTH_OPTIONS.slice(1)

export function formatFundingSourceLabel(source: (typeof FUNDING_SOURCES)[number]) {
  if (source.value === "all") return "원천"
  return `${source.label}(${source.code})`
}
