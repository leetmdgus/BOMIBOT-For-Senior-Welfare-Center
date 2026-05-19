import type {
  MonthlyPlanData,
  MonthlyPlanResponse,
  MonthlyPlanVersion,
} from "@/services/kanban.performance.types"

export const monthlyPlanMonths = [
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

const baseRows: MonthlyPlanData["rows"] = [
  {
    id: "1",
    name: "신규회원 이용상담",
    totalPeople: 960,
    totalCount: 960,
    totalBudget: 0,
    monthly: Object.fromEntries(
      monthlyPlanMonths.map((month) => [month, { people: 80, count: 80, budget: 0 }])
    ),
  },
  {
    id: "2",
    name: "신규회원 가입",
    totalPeople: 960,
    totalCount: 965,
    totalBudget: 15000000,
    monthly: {
      ...Object.fromEntries(
        monthlyPlanMonths.slice(0, 11).map((month) => [
          month,
          { people: 80, count: 80, budget: 0 },
        ])
      ),
      "12월": { people: 80, count: 85, budget: 15000000 },
    },
  },
  {
    id: "3",
    name: "신규회원 교육",
    totalPeople: 960,
    totalCount: 960,
    totalBudget: 0,
    monthly: Object.fromEntries(
      monthlyPlanMonths.map((month) => [month, { people: 80, count: 80, budget: 0 }])
    ),
  },
  {
    id: "4",
    name: "정보제공상담",
    totalPeople: 80,
    totalCount: 80,
    totalBudget: 0,
    monthly: Object.fromEntries(
      monthlyPlanMonths.map((month) => [month, { people: 8, count: 8, budget: 0 }])
    ),
  },
]

const planByVersion: Record<MonthlyPlanVersion, MonthlyPlanData> = {
  기본계획: { version: "기본계획", rows: baseRows },
  "1차추경": {
    version: "1차추경",
    rows: baseRows.map((row) => ({
      ...row,
      totalCount: row.totalCount + 5,
    })),
  },
  "2차추경": {
    version: "2차추경",
    rows: baseRows.map((row) => ({
      ...row,
      totalCount: row.totalCount + 10,
      totalBudget: row.totalBudget + 2000000,
    })),
  },
}

export function getMonthlyPlanMock(
  version: MonthlyPlanVersion = "기본계획"
): MonthlyPlanResponse {
  const data = planByVersion[version] ?? planByVersion["기본계획"]
  return {
    months: [...monthlyPlanMonths],
    data: structuredClone(data),
  }
}
