"use client"

import { Fragment } from "react"
import { months, usePerformance } from "./performance-provider"

type MonthKey = (typeof months)[number]

export function ActualTab() {
  const { aggregatedData, totals } = usePerformance()
  const displayMonths = months.slice(0, 12)

  const getMonthTotal = (
    key: "actualPeople" | "actualCount" | "actualExpense",
    month: MonthKey,
  ) => {
    return aggregatedData.reduce(
      (sum: number, item: any) => sum + (item[key][month] || 0),
      0,
    )
  }

  const getRowTotal = (
    item: any,
    key: "actualPeople" | "actualCount" | "actualExpense",
  ) => {
    return Object.values(item[key]).reduce(
      (sum: number, value: any) => sum + Number(value || 0),
      0,
    )
  }

  return (
    <div className="rounded border border-slate-300 bg-white">
      <div className="flex items-center gap-6 border-b border-slate-200 px-5 py-6">
        <h2 className="text-3xl font-bold tracking-tight">
          월별 실적 보기
        </h2>
        <p className="text-base text-slate-700">
          계획/실적 입력관리 탭에서 입력한 내용을 보여줍니다.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[2600px] border-collapse text-sm">
          <thead>
            <tr>
              <Th
                rowSpan={2}
                className="sticky left-0 z-20 w-[330px] bg-slate-100 text-left"
              >
                세부사업명 · 상세분류
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
              <Th className="bg-sky-50">인원(명)</Th>
              <Th className="bg-sky-50">횟수(회)</Th>
              <Th className="bg-sky-50">원천 / 지출(원)</Th>

              {displayMonths.map((month, index) => (
                <Fragment key={month}>
                  <Th className={index % 2 === 0 ? "bg-blue-100" : "bg-sky-50"}>
                    인원
                  </Th>
                  <Th className={index % 2 === 0 ? "bg-blue-100" : "bg-sky-50"}>
                    횟수
                  </Th>
                  <Th className={index % 2 === 0 ? "bg-blue-100" : "bg-sky-50"}>
                    원천 / 지출(원)
                  </Th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr className="bg-slate-50 font-bold">
              <StickyTd>합계</StickyTd>

              <Td right>{totals.actualPeople.toLocaleString()}</Td>
              <Td right>{totals.actualCount.toLocaleString()}</Td>
              <Td right>{totals.actualExpense.toLocaleString()}</Td>

              {displayMonths.map((month) => (
                <Fragment key={month}>
                  <Td right>{getMonthTotal("actualPeople", month)}</Td>
                  <Td right>{getMonthTotal("actualCount", month)}</Td>
                  <Td right>
                    {getMonthTotal("actualExpense", month).toLocaleString()}
                  </Td>
                </Fragment>
              ))}
            </tr>

            {aggregatedData.map((item: any) => (
              <tr key={item.subProject} className="hover:bg-sky-50/40">
                <StickyTd className="font-semibold">
                  {item.subProject}
                </StickyTd>

                <Td right>{getRowTotal(item, "actualPeople").toLocaleString()}</Td>
                <Td right>{getRowTotal(item, "actualCount").toLocaleString()}</Td>
                <Td right>{getRowTotal(item, "actualExpense").toLocaleString()}</Td>

                {displayMonths.map((month) => (
                  <Fragment key={month}>
                    <Td right>{item.actualPeople[month] || 0}</Td>
                    <Td right>{item.actualCount[month] || 0}</Td>
                    <Td right>
                      {(item.actualExpense[month] || 0).toLocaleString()}
                    </Td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-5 border-t border-slate-200 bg-slate-50">
        <div className="mx-2 mt-1 h-2 rounded-full bg-slate-300">
          <div className="h-2 w-[36%] rounded-full bg-slate-500" />
        </div>
      </div>
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
      className={`border border-slate-300 px-4 py-3 text-center font-bold whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = "",
  right,
}: {
  children?: React.ReactNode
  className?: string
  right?: boolean
}) {
  return (
    <td
      className={`border border-slate-300 px-4 py-4 whitespace-nowrap ${
        right ? "text-right" : ""
      } ${className}`}
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
      className={`sticky left-0 z-10 w-[330px] border border-slate-300 bg-white px-4 py-4 text-left whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  )
}

export default ActualTab