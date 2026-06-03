import type {
  SurveyMatrixChartRow,
  SurveyQuestionResult,
  SurveyResults,
} from "@/services/survey.types"

const TYPE_LABEL: Record<SurveyQuestionResult["type"], string> = {
  matrix: "표형",
  text: "주관식",
  choice: "객관식",
  scale: "척도",
}

const MATRIX_BUCKETS = [
  "매우불만족",
  "불만족",
  "보통",
  "만족",
  "매우만족",
] as const

/** CSV 셀 이스케이프 — 쉼표·따옴표·줄바꿈 포함 시 따옴표로 감싼다. */
function csvCell(value: string | number): string {
  const text = String(value ?? "")
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function csvRow(cells: Array<string | number>): string {
  return cells.map(csvCell).join(",")
}

function matrixRowSection(row: SurveyMatrixChartRow): Array<string | number> {
  return [
    row.name,
    ...MATRIX_BUCKETS.map((bucket) => row[bucket] ?? 0),
  ]
}

/**
 * 설문 결과를 Excel 친화적 CSV 문자열로 직렬화한다.
 * 요약 지표 + 문항별 집계(표형/척도/객관식/주관식)를 섹션으로 구성한다.
 */
export function buildSurveyResultsCsv(
  results: SurveyResults,
  surveyTitle?: string,
): string {
  const lines: string[] = []
  const { summary } = results

  if (surveyTitle) {
    lines.push(csvRow(["설문", surveyTitle]))
    lines.push("")
  }

  lines.push(csvRow(["설문 결과 요약"]))
  lines.push(csvRow(["지표", "값"]))
  lines.push(csvRow(["총 응답", `${summary.totalResponses}명`]))
  lines.push(csvRow(["목표 응답", `${summary.totalTarget}명`]))
  lines.push(csvRow(["응답률", `${summary.completionRate}%`]))
  lines.push(
    csvRow(["평균 만족도", `${summary.averageSatisfaction.toFixed(2)} / 5`]),
  )
  if (summary.positiveRate !== undefined) {
    lines.push(csvRow(["긍정 응답률", `${summary.positiveRate}%`]))
  }
  lines.push("")

  results.questions.forEach((question, index) => {
    const label = TYPE_LABEL[question.type]
    lines.push(csvRow([`[문항 ${index + 1}] ${question.title} (${label})`]))

    const meta: Array<string | number> = [
      `답변 ${question.answeredCount}`,
      `미답변 ${question.skippedCount}`,
    ]
    if (question.average !== undefined) {
      meta.push(`평균 ${question.average.toFixed(2)}`)
    }
    lines.push(csvRow(meta))

    if (question.matrixChart?.length) {
      lines.push(csvRow(["항목", ...MATRIX_BUCKETS]))
      question.matrixChart.forEach((row) => {
        lines.push(csvRow(matrixRowSection(row)))
      })
    }

    if (question.scaleData?.length) {
      lines.push(csvRow(["점수", "응답 수"]))
      question.scaleData.forEach((point) => {
        lines.push(csvRow([point.score, point.count]))
      })
    }

    if (question.pieData?.length) {
      const sum = question.pieData.reduce((acc, item) => acc + item.value, 0)
      lines.push(csvRow(["선택지", "응답 수", "비율"]))
      question.pieData.forEach((item) => {
        const ratio = sum > 0 ? `${Math.round((item.value / sum) * 100)}%` : "0%"
        lines.push(csvRow([item.name, item.value, ratio]))
      })
      if (question.otherText) {
        lines.push(csvRow(["기타(직접입력)", question.otherText]))
      }
    }

    if (question.textResponses?.length) {
      lines.push(csvRow(["응답 내용", "건수"]))
      question.textResponses.forEach((response) => {
        lines.push(csvRow([response.text, response.votes]))
      })
    }

    lines.push("")
  })

  return lines.join("\r\n")
}

/** 브라우저에서 CSV 문자열을 파일로 내려받는다 (Excel 한글 호환 BOM 포함). */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return

  // UTF-8 BOM — Excel에서 한글이 깨지지 않도록
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
