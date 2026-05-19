"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Loader2 } from "lucide-react"

import { getSurveyResults } from "@/services/survey.service"
import type {
  SurveyQuestionResult,
  SurveyQuestionType,
  SurveyResults,
} from "@/services/survey.types"

import { SURVEY_MATRIX_CHART_COLORS } from "@/lib/constants/brand"

const MATRIX_COLORS = SURVEY_MATRIX_CHART_COLORS

const TYPE_LABEL: Record<SurveyQuestionType, string> = {
  matrix: "표형",
  text: "주관식",
  choice: "객관식",
  scale: "척도",
}

export function SurveyResults({ surveyId }: { surveyId: string }) {
  const [results, setResults] = useState<SurveyResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSurveyResults(surveyId)
      .then(setResults)
      .catch((error) => {
        console.error("설문 결과 로드 실패:", error)
      })
      .finally(() => setIsLoading(false))
  }, [surveyId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">결과를 불러오는 중입니다.</p>
      </div>
    )
  }

  if (!results || results.questions.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        아직 집계된 응답이 없습니다.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {results.questions.map((question) => (
        <QuestionResultCard key={question.questionId} question={question} />
      ))}
    </div>
  )
}

function QuestionResultCard({ question }: { question: SurveyQuestionResult }) {
  const total = question.answeredCount + question.skippedCount

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          {TYPE_LABEL[question.type]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {question.title}
          </h3>
          {question.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {question.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mb-5 text-xs text-muted-foreground">
        답변 {question.answeredCount} · 미답변 {question.skippedCount}
        {total > 0
          ? ` · 응답률 ${Math.round((question.answeredCount / total) * 100)}%`
          : ""}
      </p>

      {question.matrixChart && question.matrixChart.length > 0 ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={question.matrixChart}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="매우불만족"
                fill={MATRIX_COLORS.매우불만족}
                radius={[2, 2, 0, 0]}
              />
              <Bar dataKey="불만족" fill={MATRIX_COLORS.불만족} />
              <Bar dataKey="보통" fill={MATRIX_COLORS.보통} />
              <Bar dataKey="만족" fill={MATRIX_COLORS.만족} />
              <Bar
                dataKey="매우만족"
                fill={MATRIX_COLORS.매우만족}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {question.textResponses && question.textResponses.length > 0 ? (
        <div className="space-y-3">
          {question.textResponses.map((response) => (
            <div
              key={response.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/25 p-4"
            >
              <p className="flex-1 text-sm leading-relaxed text-foreground">
                {response.text}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                답변 {response.votes}개
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {question.pieData && question.pieData.length > 0 ? (
        <div className="flex flex-wrap items-center gap-8">
          <div className="mx-auto h-52 w-52 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={question.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {question.pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-[200px] flex-1 space-y-2">
            {question.pieData.map((item) => {
              const sum = question.pieData!.reduce(
                (acc, row) => acc + row.value,
                0
              )

              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 text-sm"
                >
                  <div
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.value}
                    {sum > 0
                      ? ` (${Math.round((item.value / sum) * 100)}%)`
                      : ""}
                  </span>
                </div>
              )
            })}
          </div>

          {question.otherText ? (
            <div className="w-full rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="mb-1 font-medium text-foreground">
                기타(직접입력) {question.otherCount ?? 1}
              </p>
              <p className="text-muted-foreground">{question.otherText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
