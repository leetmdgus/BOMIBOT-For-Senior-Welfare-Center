"use client"

import { Fragment, useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { getBusinessPlanReport } from "@/services/kanban.documents.service"
import type { BusinessPlanReport } from "@/services/kanban.documents.types"

import { useDocuments } from "./documents-provider"

export function BusinessPlanContent() {
  const { year } = useDocuments()
  const [report, setReport] = useState<BusinessPlanReport | null>(null)

  useEffect(() => {
    getBusinessPlanReport()
      .then(setReport)
      .catch((error) => {
        console.error("사업계획서 데이터 로드 실패:", error)
      })
  }, [])

  if (!report) {
    return (
      <div className="rounded-lg border border-slate-300 bg-white p-12 text-center text-muted-foreground">
        사업계획서를 불러오는 중입니다.
      </div>
    )
  }

  const { stats, projects } = report

  return (
    <div className="kanban-documents-report space-y-6">
      <div className="kanban-documents-report__stats rounded-lg border border-slate-300 bg-white p-6 print:break-inside-avoid">
        <h3 className="mb-4 text-lg font-semibold">연도별 통계</h3>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={cn("text-3xl font-bold", stat.color)}>
                {stat.value}
                {stat.unit ? (
                  <span className="ml-1 text-lg font-semibold">{stat.unit}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-slate-700 text-white">
                <Th className="w-16">대분류</Th>
                <Th className="w-40">하위분류</Th>
                <Th className="w-36">세부사업명</Th>
                <Th className="w-20">명</Th>
                <Th className="w-20">회</Th>
                <Th className="w-28">예산(천원)</Th>
                <Th>사업내용</Th>
              </tr>
            </thead>

            <tbody>
              {projects.map((project, projectIndex) => (
                <Fragment key={`${project.subCategory}-${projectIndex}`}>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
                    <Td />
                    <Td />
                    <Td>소계</Td>
                    <Td center>
                      {project.subtotal.people.toLocaleString()}
                    </Td>
                    <Td center>
                      {project.subtotal.count.toLocaleString()}
                    </Td>
                    <Td right>
                      {project.subtotal.budget.toLocaleString()}
                    </Td>
                    <Td>{project.subtotal.content}</Td>
                  </tr>

                  {project.items.map((item, itemIndex) => (
                    <tr
                      key={`${project.subCategory}-${item.name}-${itemIndex}`}
                      className="border-b border-slate-200"
                    >
                      {itemIndex === 0 ? (
                        <>
                          <Td
                            center
                            rowSpan={project.items.length}
                            className="align-top font-medium"
                          >
                            {project.category}
                          </Td>
                          <Td
                            rowSpan={project.items.length}
                            className="max-w-[160px] align-top leading-snug"
                          >
                            {project.subCategory}
                          </Td>
                        </>
                      ) : null}

                      <Td>{item.name}</Td>
                      <Td center>{item.people.toLocaleString()}</Td>
                      <Td center>{item.count.toLocaleString()}</Td>
                      <Td right>
                        {item.budget > 0 ? (
                          <div>
                            <p>사업수익 {item.budget.toLocaleString()}</p>
                            <p>계 {item.budget.toLocaleString()}</p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="min-w-[360px] whitespace-normal">
                        <div className="space-y-1 text-xs leading-relaxed">
                          <p>
                            <span className="text-muted-foreground">목적 </span>
                            <span className="text-sky-700">{item.purpose}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">대상 </span>
                            {item.target}
                          </p>
                          <p>
                            <span className="text-muted-foreground">기간 </span>
                            <span className="text-sky-700">{item.period}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">운영방법 </span>
                            <span className="text-sky-700">{item.method}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">평가방법 </span>
                            <span className="text-sky-700">{item.evaluation}</span>
                          </p>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>

        <p className="border-t border-slate-200 px-4 py-2 text-xs text-muted-foreground print:text-slate-600">
          {year}년 통합 사업계획서
        </p>
      </div>
    </div>
  )
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "border border-slate-600 px-3 py-2.5 text-center font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className = "",
  center,
  right,
  rowSpan,
}: {
  children?: React.ReactNode
  className?: string
  center?: boolean
  right?: boolean
  rowSpan?: number
}) {
  return (
    <td
      rowSpan={rowSpan}
      className={cn(
        "border border-slate-200 px-3 py-2",
        center && "text-center",
        right && "text-right",
        className,
      )}
    >
      {children}
    </td>
  )
}
