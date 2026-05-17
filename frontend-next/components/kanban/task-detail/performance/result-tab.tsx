"use client"

import { Fragment } from "react"
import { cn } from "@/lib/utils"
import { months, usePerformance } from "./performance-provider"

type MonthKey = (typeof months)[number]

type MonthlyValues = Partial<Record<MonthKey, number>>

type AggregatedItem = {
  subProject: string
  planPeople: MonthlyValues
  planCount: MonthlyValues
  planBudget: MonthlyValues
  actualPeople: MonthlyValues
  actualCount: MonthlyValues
  actualExpense: MonthlyValues
}

const displayMonths = months.slice(0, 12)

const sumMonthlyValues = (values: MonthlyValues) => {
  return Object.values(values).reduce<number>(
    (sum, value) => sum + Number(value || 0),
    0,
  )
}

const getMonthlyTotal = (
  items: AggregatedItem[],
  key: keyof Omit<AggregatedItem, "subProject">,
  month: MonthKey,
) => {
  return items.reduce(
    (sum, item) => sum + Number(item[key][month] || 0),
    0,
  )
}

export function ResultTab() {
  const { aggregatedData, totals, getProgressRate, getProgressColor } =
    usePerformance()

  const data = aggregatedData as AggregatedItem[]

  return (
    <div className="w-full overflow-hidden rounded border border-slate-300 bg-white">
      <div className="flex min-h-[88px] items-center gap-6 border-b border-slate-200 px-5 py-6">
        <h2 className="shrink-0 text-3xl font-bold tracking-tight">
          사업결과 (계획 대비 진행률)
        </h2>

        <p className="text-base text-slate-700">
          계획 대비 실적 진행률 및 실적 미진/초과 사유·해결방안 입력
        </p>
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden">
        <table className="w-max min-w-[2700px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[330px]" />
            <col className="w-[64px]" />
            <col className="w-[88px]" />
            <col className="w-[88px]" />
            <col className="w-[198px]" />

            {displayMonths.map((month) => (
              <Fragment key={month}>
                <col className="w-[88px]" />
                <col className="w-[88px]" />
                <col className="w-[198px]" />
              </Fragment>
            ))}
          </colgroup>

          <thead>
            <tr>
              <Th rowSpan={2} className="bg-slate-100">
                세부사업명 · 상세분류
              </Th>

              <Th rowSpan={2} className="bg-slate-100">
                구분
              </Th>

              <Th colSpan={3} className="bg-slate-100">
                총계
              </Th>

              {displayMonths.map((month, index) => (
                <Th
                  key={month}
                  colSpan={3}
                  className={index % 2 === 0 ? "bg-blue-200" : "bg-sky-50"}
                >
                  {month}
                </Th>
              ))}
            </tr>

            <tr>
              <Th className="bg-sky-50">인원</Th>
              <Th className="bg-sky-50">횟수</Th>
              <Th className="bg-sky-50">예산(원)</Th>

              {displayMonths.map((month, index) => (
                <Fragment key={month}>
                  <Th className={index % 2 === 0 ? "bg-blue-100" : "bg-sky-50"}>
                    인원
                  </Th>

                  <Th className={index % 2 === 0 ? "bg-blue-100" : "bg-sky-50"}>
                    횟수
                  </Th>

                  <Th className={index % 2 === 0 ? "bg-blue-100" : "bg-sky-50"}>
                    예산(원)
                  </Th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            <ResultRows
              title="합계"
              planPeople={totals.planPeople}
              planCount={totals.planCount}
              planBudget={totals.planBudget}
              actualPeople={totals.actualPeople}
              actualCount={totals.actualCount}
              actualExpense={totals.actualExpense}
              monthlyPlanPeople={(month) =>
                getMonthlyTotal(data, "planPeople", month)
              }
              monthlyPlanCount={(month) =>
                getMonthlyTotal(data, "planCount", month)
              }
              monthlyPlanBudget={(month) =>
                getMonthlyTotal(data, "planBudget", month)
              }
              monthlyActualPeople={(month) =>
                getMonthlyTotal(data, "actualPeople", month)
              }
              monthlyActualCount={(month) =>
                getMonthlyTotal(data, "actualCount", month)
              }
              monthlyActualExpense={(month) =>
                getMonthlyTotal(data, "actualExpense", month)
              }
              getProgressRate={getProgressRate}
              getProgressColor={getProgressColor}
            />

            {data.map((item) => (
              <ResultRows
                key={item.subProject}
                title={item.subProject}
                planPeople={sumMonthlyValues(item.planPeople)}
                planCount={sumMonthlyValues(item.planCount)}
                planBudget={sumMonthlyValues(item.planBudget)}
                actualPeople={sumMonthlyValues(item.actualPeople)}
                actualCount={sumMonthlyValues(item.actualCount)}
                actualExpense={sumMonthlyValues(item.actualExpense)}
                monthlyPlanPeople={(month) => item.planPeople[month] || 0}
                monthlyPlanCount={(month) => item.planCount[month] || 0}
                monthlyPlanBudget={(month) => item.planBudget[month] || 0}
                monthlyActualPeople={(month) => item.actualPeople[month] || 0}
                monthlyActualCount={(month) => item.actualCount[month] || 0}
                monthlyActualExpense={(month) => item.actualExpense[month] || 0}
                getProgressRate={getProgressRate}
                getProgressColor={getProgressColor}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultRows({
  title,
  planPeople,
  planCount,
  planBudget,
  actualPeople,
  actualCount,
  actualExpense,
  monthlyPlanPeople,
  monthlyPlanCount,
  monthlyPlanBudget,
  monthlyActualPeople,
  monthlyActualCount,
  monthlyActualExpense,
  getProgressRate,
  getProgressColor,
}: {
  title: string
  planPeople: number
  planCount: number
  planBudget: number
  actualPeople: number
  actualCount: number
  actualExpense: number
  monthlyPlanPeople: (month: MonthKey) => number
  monthlyPlanCount: (month: MonthKey) => number
  monthlyPlanBudget: (month: MonthKey) => number
  monthlyActualPeople: (month: MonthKey) => number
  monthlyActualCount: (month: MonthKey) => number
  monthlyActualExpense: (month: MonthKey) => number
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
}) {
  return (
    <>
      <tr>
        <TitleTd rowSpan={3}>{title}</TitleTd>
        <TypeTd>계획</TypeTd>

        <Td right strong>
          {planPeople.toLocaleString()}
        </Td>

        <Td right strong>
          {planCount.toLocaleString()}
        </Td>

        <Td right strong>
          <BudgetCell value={planBudget} />
        </Td>

        {displayMonths.map((month) => (
          <Fragment key={month}>
            <Td right strong>
              {monthlyPlanPeople(month).toLocaleString()}
            </Td>

            <Td right strong>
              {monthlyPlanCount(month).toLocaleString()}
            </Td>

            <Td right strong>
              {monthlyPlanBudget(month).toLocaleString()}
            </Td>
          </Fragment>
        ))}
      </tr>

      <tr>
        <TypeTd>실적</TypeTd>

        <Td right strong>
          {actualPeople.toLocaleString()}
        </Td>

        <Td right strong>
          {actualCount.toLocaleString()}
        </Td>

        <Td right strong>
          {actualExpense.toLocaleString()}
        </Td>

        {displayMonths.map((month) => (
          <Fragment key={month}>
            <Td right strong>
              {monthlyActualPeople(month).toLocaleString()}
            </Td>

            <Td right strong>
              {monthlyActualCount(month).toLocaleString()}
            </Td>

            <Td right strong>
              {monthlyActualExpense(month).toLocaleString()}
            </Td>
          </Fragment>
        ))}
      </tr>

      <tr className="border-b-2 border-slate-400 bg-blue-50/40">
        <TypeTd>진행률</TypeTd>

        <ProgressTd
          plan={planPeople}
          actual={actualPeople}
          getProgressRate={getProgressRate}
          getProgressColor={getProgressColor}
        />

        <ProgressTd
          plan={planCount}
          actual={actualCount}
          getProgressRate={getProgressRate}
          getProgressColor={getProgressColor}
        />

        <Td center>-</Td>

        {displayMonths.map((month) => (
          <Fragment key={month}>
            <ProgressTd
              plan={monthlyPlanPeople(month)}
              actual={monthlyActualPeople(month)}
              getProgressRate={getProgressRate}
              getProgressColor={getProgressColor}
            />

            <ProgressTd
              plan={monthlyPlanCount(month)}
              actual={monthlyActualCount(month)}
              getProgressRate={getProgressRate}
              getProgressColor={getProgressColor}
            />

            <Td center>-</Td>
          </Fragment>
        ))}
      </tr>
    </>
  )
}

function ProgressTd({
  plan,
  actual,
  getProgressRate,
  getProgressColor,
}: {
  plan: number
  actual: number
  getProgressRate: (plan: number, actual: number) => string
  getProgressColor: (plan: number, actual: number) => string
}) {
  return (
    <td
      className={cn(
        "border border-slate-300 px-4 py-3 text-center font-bold whitespace-nowrap align-middle",
        getProgressColor(plan, actual),
      )}
    >
      {getProgressRate(plan, actual)}
    </td>
  )
}

function BudgetCell({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
      {value > 0 && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-500 text-xs font-bold text-white">
          수
        </span>
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
      className={`border border-slate-300 px-4 py-3 text-center font-bold whitespace-nowrap align-middle ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = "",
  right,
  center,
  strong,
}: {
  children?: React.ReactNode
  className?: string
  right?: boolean
  center?: boolean
  strong?: boolean
}) {
  return (
    <td
      className={`border border-slate-300 px-4 py-3 whitespace-nowrap align-middle ${
        right ? "text-right" : ""
      } ${center ? "text-center" : ""} ${strong ? "font-bold" : ""} ${className}`}
    >
      {children}
    </td>
  )
}

function TitleTd({
  children,
  rowSpan,
}: {
  children?: React.ReactNode
  rowSpan?: number
}) {
  return (
    <td
      rowSpan={rowSpan}
      className="border border-slate-300 bg-white px-5 py-4 text-left font-bold whitespace-nowrap align-middle"
    >
      {children}
    </td>
  )
}

function TypeTd({ children }: { children?: React.ReactNode }) {
  return (
    <td className="border border-slate-300 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-500 whitespace-nowrap align-middle">
      {children}
    </td>
  )
}

export default ResultTab