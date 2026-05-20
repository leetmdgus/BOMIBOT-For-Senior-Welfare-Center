import type { GraphQueryResult, KnowledgeGraph } from "./types"

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`
}

/** 온톨로지 서브그래프만으로 규칙 기반 답변 (LLM 폴백) */
export function answerFromKnowledgeGraph(
  question: string,
  query: GraphQueryResult,
  graph: KnowledgeGraph,
): { content: string; sources: string[] } {
  const q = question.trim()
  const { subgraph, reasoningPaths } = query

  const perfRecords = subgraph.nodes.filter(
    (n) => n.type === "PerformanceRecord",
  )
  const indicators = subgraph.nodes.filter(
    (n) => n.type === "DashboardIndicator",
  )
  const tasks = subgraph.nodes.filter((n) => n.type === "Task")
  const surveys = subgraph.nodes.filter((n) => n.type === "Survey")

  const lines: string[] = [
    "온톨로지 지식 그래프를 따라 답변드립니다.",
    "",
  ]

  if (/그래프|온톨로지|구조|관계/.test(q)) {
    lines.push(
      `질문과 연결된 서브그래프: 노드 ${subgraph.nodes.length}개, 관계 ${subgraph.edges.length}개입니다.`,
      "",
      "추론 경로 예시:",
      ...reasoningPaths.slice(0, 8).map((p) => `· ${p}`),
      "",
      "포함 개념 유형:",
      ...[...new Set(subgraph.nodes.map((n) => n.type))].map((t) => `· ${t}`),
    )
    return {
      content: lines.join("\n"),
      sources: ["ontology", "aggregate"],
    }
  }

  if (perfRecords.length > 0) {
    let planBudget = 0
    let actualExpense = 0
    for (const r of perfRecords) {
      planBudget += Number(r.properties?.planBudget ?? 0)
      actualExpense += Number(r.properties?.actualExpense ?? 0)
    }
    lines.push(
      `계획/실적 레코드 ${perfRecords.length}건을 그래프에서 집계했습니다.`,
      `· 계획 예산 합계: ${formatWon(planBudget)}`,
      `· 실적 지출 합계: ${formatWon(actualExpense)}`,
    )
    if (planBudget > 0) {
      lines.push(
        `· 예산 집행률: ${Math.round((actualExpense / planBudget) * 100)}%`,
      )
    }
    lines.push("")
  }

  if (indicators.length > 0 && /대시보드|현황|인원|프로젝트/.test(q)) {
    lines.push("대시보드 지표 (그래프 노드):")
    for (const ind of indicators.slice(0, 5)) {
      lines.push(
        `· ${ind.label}: ${ind.properties?.value ?? ""}${ind.properties?.unit ?? ""}`,
      )
    }
    lines.push("")
  }

  if (tasks.length > 0 && /칸반|업무|태스크/.test(q)) {
    lines.push(`칸반 업무 카드 ${tasks.length}건이 서브그래프에 포함됩니다.`)
    for (const t of tasks.slice(0, 5)) {
      lines.push(`· ${t.label}`)
    }
    lines.push("")
  }

  if (surveys.length > 0 && /설문|만족도/.test(q)) {
    lines.push("설문 노드:")
    for (const s of surveys.slice(0, 5)) {
      lines.push(
        `· ${s.label} (${s.properties?.status ?? ""}, 응답 ${s.properties?.responseCount}/${s.properties?.totalTarget})`,
      )
    }
    lines.push("")
  }

  if (lines.length <= 2) {
    lines.push(
      "질문과 직접 연결된 노드를 찾았으나 집계 규칙이 없습니다.",
      "추론 경로:",
      ...reasoningPaths.slice(0, 5).map((p) => `· ${p}`),
    )
  }

  const domainKey = subgraph.nodes
    .find((n) => n.id.startsWith("domain:"))
    ?.id.replace("domain:", "")

  const sources = domainKey
    ? (["ontology", domainKey] as string[])
    : ["ontology"]

  return {
    content: lines.join("\n").trim(),
    sources: [...new Set(sources)],
  }
}
