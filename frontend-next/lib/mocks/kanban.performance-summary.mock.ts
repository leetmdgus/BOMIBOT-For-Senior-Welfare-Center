import type { PerformanceSummaryRow } from "@/services/kanban.performance.types"
import type { PerformanceFundingSource } from "@/services/kanban.performance.types"

export type { PerformanceSummaryRow } from "@/services/kanban.performance.types"

type SummaryMetrics = {
  people: number
  count: number
  budget: number
}

const monthKeys = [
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
]

const emptyMonthly = (values?: Partial<SummaryMetrics>) => {
  const base = values ?? { people: 0, count: 0, budget: 0 }

  return Object.fromEntries(
    monthKeys.map((month) => [month, { ...base }]),
  ) as Record<string, SummaryMetrics>
}

const row = (
  id: string,
  subProject: string,
  detailCategory: string,
  fundingSources: PerformanceFundingSource[],
  planTotal: SummaryMetrics,
  actualTotal: SummaryMetrics,
  planMonthly?: Partial<Record<string, Partial<SummaryMetrics>>>,
  actualMonthly?: Partial<Record<string, Partial<SummaryMetrics>>>,
): PerformanceSummaryRow => {
  const planMonthlyData = emptyMonthly()
  const actualMonthlyData = emptyMonthly()

  monthKeys.forEach((month) => {
    planMonthlyData[month] = {
      people: planMonthly?.[month]?.people ?? 0,
      count: planMonthly?.[month]?.count ?? 0,
      budget: planMonthly?.[month]?.budget ?? 0,
    }
    actualMonthlyData[month] = {
      people: actualMonthly?.[month]?.people ?? 0,
      count: actualMonthly?.[month]?.count ?? 0,
      budget: actualMonthly?.[month]?.budget ?? 0,
    }
  })

  return {
    id,
    subProject,
    detailCategory,
    fundingSources,
    plan: { total: planTotal, monthly: planMonthlyData },
    actual: { total: actualTotal, monthly: actualMonthlyData },
  }
}

/** 초기 시드 — `inputManagementRows`로 펼쳐 단일 입력 소스와 동기화 */
export const performanceSummarySeedRows: PerformanceSummaryRow[] = [
  row(
    "1",
    "사진공모전",
    "홍보",
    ["비"],
    { people: 130, count: 130, budget: 500_000 },
    { people: 128, count: 128, budget: 480_000 },
    {
      "1월": { people: 10, count: 10, budget: 40_000 },
      "2월": { people: 10, count: 10, budget: 40_000 },
      "5월": { people: 11, count: 11, budget: 42_000 },
    },
    {
      "1월": { people: 10, count: 10, budget: 38_000 },
      "2월": { people: 9, count: 9, budget: 38_000 },
      "5월": { people: 10, count: 10, budget: 39_500 },
    },
  ),
  row(
    "2",
    "나눔릴레이",
    "프로그램진행",
    ["지", "비"],
    { people: 200, count: 200, budget: 1_200_000 },
    { people: 195, count: 198, budget: 1_150_000 },
    {
      "1월": { people: 16, count: 16, budget: 100_000 },
      "2월": { people: 17, count: 17, budget: 100_000 },
      "5월": { people: 18, count: 18, budget: 105_000 },
    },
    {
      "1월": { people: 15, count: 16, budget: 95_000 },
      "2월": { people: 16, count: 17, budget: 96_000 },
      "5월": { people: 17, count: 18, budget: 98_000 },
    },
  ),
  row(
    "2b",
    "나눔릴레이",
    "홍보",
    ["비"],
    { people: 60, count: 60, budget: 200_000 },
    { people: 58, count: 59, budget: 190_000 },
    { "5월": { people: 5, count: 5, budget: 18_000 } },
    { "5월": { people: 5, count: 5, budget: 17_500 } },
  ),
  row(
    "3",
    "지역사회 조직화",
    "프로그램진행",
    ["기"],
    { people: 180, count: 180, budget: 900_000 },
    { people: 172, count: 175, budget: 880_000 },
    { "5월": { people: 15, count: 15, budget: 75_000 } },
    { "5월": { people: 14, count: 15, budget: 73_000 } },
  ),
  row(
    "4",
    "나눔릴레이 홍보",
    "홍보",
    ["비"],
    { people: 90, count: 90, budget: 300_000 },
    { people: 88, count: 88, budget: 290_000 },
    { "5월": { people: 8, count: 8, budget: 28_000 } },
    { "5월": { people: 8, count: 8, budget: 27_000 } },
  ),
  row(
    "5",
    "발대식",
    "프로그램진행",
    ["법"],
    { people: 120, count: 120, budget: 600_000 },
    { people: 118, count: 119, budget: 590_000 },
    { "5월": { people: 10, count: 10, budget: 50_000 } },
    { "5월": { people: 10, count: 10, budget: 49_000 } },
  ),
  row(
    "6",
    "모금 활동",
    "프로그램진행",
    ["지"],
    { people: 150, count: 150, budget: 750_000 },
    { people: 145, count: 148, budget: 720_000 },
    { "5월": { people: 12, count: 12, budget: 62_000 } },
    { "5월": { people: 12, count: 12, budget: 60_000 } },
  ),
  row(
    "7",
    "모금결과 안내",
    "홍보",
    ["사"],
    { people: 80, count: 80, budget: 200_000 },
    { people: 80, count: 80, budget: 200_000 },
    { "5월": { people: 7, count: 7, budget: 18_000 } },
    { "5월": { people: 7, count: 7, budget: 18_000 } },
  ),
]

/** @deprecated `performanceSummarySeedRows` 사용 */
export const performanceSummaryRows = performanceSummarySeedRows
