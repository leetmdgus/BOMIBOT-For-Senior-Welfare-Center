"use client"

import { useMemo, useState } from "react"

type PlanVersion =
  | "기본계획"
  | "1차추경"
  | "2차추경"

type MonthlyData = {
  people: number
  count: number
  budget: number
}

type RowData = {
  id: string
  name: string
  totalPeople: number
  totalCount: number
  totalBudget: number
  monthly: Record<string, MonthlyData>
}

const months = [
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

const initialRows: RowData[] = [
  {
    id: "1",
    name: "신규회원 이용상담",
    totalPeople: 960,
    totalCount: 960,
    totalBudget: 0,

    monthly: {
      "1월": { people: 80, count: 80, budget: 0 },
      "2월": { people: 80, count: 80, budget: 0 },
      "3월": { people: 80, count: 80, budget: 0 },
      "4월": { people: 80, count: 80, budget: 0 },
      "5월": { people: 80, count: 80, budget: 0 },
      "6월": { people: 80, count: 80, budget: 0 },
      "7월": { people: 80, count: 80, budget: 0 },
      "8월": { people: 80, count: 80, budget: 0 },
      "9월": { people: 80, count: 80, budget: 0 },
      "10월": { people: 80, count: 80, budget: 0 },
      "11월": { people: 80, count: 80, budget: 0 },
      "12월": { people: 80, count: 80, budget: 0 },
    },
  },

  {
    id: "2",
    name: "신규회원 가입",
    totalPeople: 960,
    totalCount: 965,
    totalBudget: 15000000,

    monthly: {
      "1월": { people: 80, count: 80, budget: 0 },
      "2월": { people: 80, count: 80, budget: 0 },
      "3월": { people: 80, count: 80, budget: 0 },
      "4월": { people: 80, count: 80, budget: 0 },
      "5월": { people: 80, count: 80, budget: 0 },
      "6월": { people: 80, count: 80, budget: 0 },
      "7월": { people: 80, count: 80, budget: 0 },
      "8월": { people: 80, count: 80, budget: 0 },
      "9월": { people: 80, count: 80, budget: 0 },
      "10월": { people: 80, count: 80, budget: 0 },
      "11월": { people: 80, count: 80, budget: 0 },

      "12월": {
        people: 80,
        count: 85,
        budget: 15000000,
      },
    },
  },

  {
    id: "3",
    name: "신규회원 교육",
    totalPeople: 960,
    totalCount: 960,
    totalBudget: 0,

    monthly: {
      "1월": { people: 80, count: 80, budget: 0 },
      "2월": { people: 80, count: 80, budget: 0 },
      "3월": { people: 80, count: 80, budget: 0 },
      "4월": { people: 80, count: 80, budget: 0 },
      "5월": { people: 80, count: 80, budget: 0 },
      "6월": { people: 80, count: 80, budget: 0 },
      "7월": { people: 80, count: 80, budget: 0 },
      "8월": { people: 80, count: 80, budget: 0 },
      "9월": { people: 80, count: 80, budget: 0 },
      "10월": { people: 80, count: 80, budget: 0 },
      "11월": { people: 80, count: 80, budget: 0 },
      "12월": { people: 80, count: 80, budget: 0 },
    },
  },

  {
    id: "4",
    name: "정보제공상담",
    totalPeople: 80,
    totalCount: 80,
    totalBudget: 0,

    monthly: {
      "1월": { people: 8, count: 8, budget: 0 },
      "2월": { people: 8, count: 8, budget: 0 },
      "3월": { people: 8, count: 8, budget: 0 },
      "4월": { people: 8, count: 8, budget: 0 },
      "5월": { people: 8, count: 8, budget: 0 },
      "6월": { people: 8, count: 8, budget: 0 },
      "7월": { people: 8, count: 8, budget: 0 },
      "8월": { people: 8, count: 8, budget: 0 },
      "9월": { people: 8, count: 8, budget: 0 },
      "10월": { people: 8, count: 8, budget: 0 },
      "11월": { people: 8, count: 8, budget: 0 },
      "12월": { people: 8, count: 8, budget: 0 },
    },
  },
]

export function MonthlyPlanView() {
  const [planVersion, setPlanVersion] =
    useState<PlanVersion>("기본계획")

  const totals = useMemo(() => {
    const result = {
      totalPeople: 0,
      totalCount: 0,
      totalBudget: 0,
      monthly: {} as Record<string, MonthlyData>,
    }

    months.forEach((month) => {
      result.monthly[month] = {
        people: 0,
        count: 0,
        budget: 0,
      }
    })

    initialRows.forEach((row) => {
      result.totalPeople += row.totalPeople
      result.totalCount += row.totalCount
      result.totalBudget += row.totalBudget

      months.forEach((month) => {
        result.monthly[month].people +=
          row.monthly[month].people

        result.monthly[month].count +=
          row.monthly[month].count

        result.monthly[month].budget +=
          row.monthly[month].budget
      })
    })

    return result
  }, [])

  return (
    <div className="w-full bg-white">
      <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-4">
        <h1 className="text-4xl font-bold tracking-tight">
          월별 계획 보기
        </h1>

        <span className="text-sm text-slate-700">
          계획/실적 입력관리 탭에서 입력한 내용을 보여줍니다.
        </span>

        <span className="text-sm text-slate-500">
          (사업실적·사업결과에는 최신 추경이
          적용됩니다)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[2600px] border-collapse text-sm">
          <thead>
            <tr>
              <Th
                rowSpan={2}
                className="sticky left-0 z-20 min-w-[330px] bg-slate-100 text-left"
              >
                세부사업명 · 상세분류
              </Th>

              <Th
                colSpan={3}
                className="bg-slate-100"
              >
                총계
              </Th>

              {months.map((month, index) => (
                <Th
                  key={month}
                  colSpan={3}
                  className={
                    index % 2 === 0
                      ? "bg-blue-100"
                      : "bg-sky-50"
                  }
                >
                  {month}
                </Th>
              ))}
            </tr>

            <tr>
              <SubHeader />

              {months.map((month, index) => (
                <SubHeader
                  key={month}
                  blue={index % 2 === 0}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            <tr className="bg-slate-50 font-bold">
              <StickyTd>합계</StickyTd>

              <Td right strong>
                {totals.totalPeople.toLocaleString()}
              </Td>

              <Td right strong>
                {totals.totalCount.toLocaleString()}
              </Td>

              <Td right strong>
                <BudgetCell
                  value={totals.totalBudget}
                  icon
                />
              </Td>

              {months.map((month) => (
                <MonthCells
                  key={month}
                  data={totals.monthly[month]}
                  strong
                />
              ))}
            </tr>

            {initialRows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-sky-50/40"
              >
                <StickyTd className="font-semibold">
                  {row.name}
                </StickyTd>

                <Td right>
                  {row.totalPeople.toLocaleString()}
                </Td>

                <Td right>
                  {row.totalCount.toLocaleString()}
                </Td>

                <Td right>
                  <BudgetCell
                    value={row.totalBudget}
                    icon={row.totalBudget > 0}
                  />
                </Td>

                {months.map((month) => (
                  <MonthCells
                    key={month}
                    data={row.monthly[month]}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-5 border-t border-slate-200 bg-slate-50">
        <div className="mx-4 mt-1 h-2 rounded-full bg-slate-300">
          <div className="ml-[40%] h-2 w-[35%] rounded-full bg-slate-500" />
        </div>
      </div>
    </div>
  )
}

function SubHeader({
  blue,
}: {
  blue?: boolean
}) {
  const bg = blue
    ? "bg-blue-50"
    : "bg-sky-50"

  return (
    <>
      <Th className={bg}>인원</Th>
      <Th className={bg}>횟수</Th>
      <Th className={bg}>예산(원)</Th>
    </>
  )
}

function MonthCells({
  data,
  strong,
}: {
  data: MonthlyData
  strong?: boolean
}) {
  return (
    <>
      <Td right strong={strong}>
        {data.people.toLocaleString()}
      </Td>

      <Td right strong={strong}>
        {data.count.toLocaleString()}
      </Td>

      <Td right strong={strong}>
        <BudgetCell
          value={data.budget}
          icon={data.budget > 0}
        />
      </Td>
    </>
  )
}

function BudgetCell({
  value,
  icon,
}: {
  value: number
  icon?: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {icon && (
        <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500 text-[10px] font-bold text-white">
          수
        </div>
      )}

      <span>{value.toLocaleString()}</span>
    </div>
  )
}

function Th({
  children,
  className = "",
  colSpan,
  rowSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
  rowSpan?: number
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-slate-300 px-4 py-4 text-center font-bold whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = "",
  right,
  strong,
}: {
  children?: React.ReactNode
  className?: string
  right?: boolean
  strong?: boolean
}) {
  return (
    <td
      className={`border border-slate-300 px-4 py-5 whitespace-nowrap ${
        right ? "text-right" : ""
      } ${strong ? "font-bold" : ""} ${className}`}
    >
      {children}
    </td>
  )
}

function StickyTd({
  children,
  className = "",
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={`sticky left-0 z-10 min-w-[330px] border border-slate-300 bg-white px-4 py-5 text-left whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  )
}

export default MonthlyPlanView