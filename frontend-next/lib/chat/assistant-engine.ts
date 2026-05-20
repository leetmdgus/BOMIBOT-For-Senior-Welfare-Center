import type {
  AssistantAnswer,
  AssistantDataSnapshot,
  MetricTotals,
} from "./assistant-types"

const MONTH_PATTERN = /(\d{1,2})\s*월/

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`
}

function formatMetricBlock(label: string, metrics: MetricTotals) {
  const executionRate =
    metrics.planBudget > 0
      ? Math.round((metrics.actualExpense / metrics.planBudget) * 100)
      : 0

  return [
    `【${label}】`,
    `· 계획: 인원 ${metrics.planPeople.toLocaleString()}명, 횟수 ${metrics.planCount.toLocaleString()}회, 예산 ${formatWon(metrics.planBudget)}`,
    `· 실적: 인원 ${metrics.actualPeople.toLocaleString()}명, 횟수 ${metrics.actualCount.toLocaleString()}회, 지출 ${formatWon(metrics.actualExpense)}`,
    metrics.planBudget > 0
      ? `· 예산 집행률: ${executionRate}%`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
}

function parseMonth(text: string): string | null {
  const match = text.match(MONTH_PATTERN)
  if (!match) return null
  return `${Number(match[1])}월`
}

function findSubProject(text: string, snapshot: AssistantDataSnapshot): string | null {
  const normalized = text.replace(/\s/g, "")
  return (
    snapshot.performance.subProjects.find((name) =>
      normalized.includes(name.replace(/\s/g, "")),
    ) ?? null
  )
}

function isAggregateQuery(text: string) {
  return /총|합계|전체|요약|현황|집계|몇\s*개|얼마|알려|보여|정리/.test(text)
}

function matchDomain(text: string) {
  return {
    performance: /실적|계획|예산|지출|세목|세세목|추경|원천|입력관리/.test(text),
    dashboard: /대시보드|달성률|인원\s*현황|프로젝트|서비스\s*이용/.test(text),
    kanban: /칸반|업무|태스크|카드|보드/.test(text),
    organization: /조직|직원|부서|인사/.test(text),
    ebooks: /전자책|ebook|자료실|도서/.test(text),
    survey: /설문|만족도/.test(text),
  }
}

function answerHelp(): AssistantAnswer {
  return {
    sources: ["help"],
    content: [
      "봄이봇 데이터 어시스턴트입니다. 아래처럼 질문해 보세요.",
      "",
      "· 전체 요약: 「실적 데이터 전체 요약해줘」",
      "· 월별: 「5월 계획·실적 합계는?」",
      "· 세목별: 「온라인홍보 실적 알려줘」",
      "· 대시보드: 「대시보드 현황 요약」",
      "· 칸반: 「칸반 업무 몇 개야?」",
      "",
      "여러 영역을 한 번에 묻으면 통합 요약으로 답변합니다.",
    ].join("\n"),
  }
}

function answerGreeting(snapshot: AssistantDataSnapshot): AssistantAnswer {
  const { performance, kanban } = snapshot
  return {
    sources: ["aggregate", "help"],
    content: [
      "안녕하세요! 저장된 사업 데이터를 바탕으로 답변드립니다.",
      "",
      `현재 연결된 데이터 기준: 실적 입력 ${performance.rowCount}건, 칸반 업무 ${kanban.taskCount}건, 설문 ${snapshot.surveys.totalCount}건.`,
      "궁금한 항목을 자연어로 물어보시거나 아래 추천 질문을 눌러 보세요.",
    ].join("\n"),
  }
}

const monthEntries = (snapshot: AssistantDataSnapshot) =>
  Object.entries(snapshot.performance.byMonth).sort(
    (a, b) => parseInt(a[0], 10) - parseInt(b[0], 10),
  )

function answerPerformanceAggregate(snapshot: AssistantDataSnapshot): AssistantAnswer {
  const { performance } = snapshot
  const lines = [
    "계획/실적 입력 데이터 전체 집계입니다.",
    "",
    formatMetricBlock("전체", performance.totals),
    "",
    "월별 계획 예산 상위:",
    ...monthEntries(snapshot)
      .filter(([, m]) => m.planBudget > 0 || m.actualExpense > 0)
      .slice(0, 6)
      .map(
        ([month, m]) =>
          `· ${month}: 계획 ${formatWon(m.planBudget)} / 실적 ${formatWon(m.actualExpense)}`,
      ),
    "",
    `세목 ${performance.subProjects.length}개: ${performance.subProjects.slice(0, 8).join(", ")}${performance.subProjects.length > 8 ? " …" : ""}`,
  ]

  return { sources: ["aggregate", "performance"], content: lines.join("\n") }
}

function answerPerformanceMonth(
  month: string,
  snapshot: AssistantDataSnapshot,
): AssistantAnswer {
  const metrics = snapshot.performance.byMonth[month] ?? emptyMetrics()

  if (
    metrics.planBudget === 0 &&
    metrics.actualExpense === 0 &&
    metrics.planPeople === 0
  ) {
    return {
      sources: ["performance"],
      content: `${month}에 등록된 계획/실적 데이터가 없습니다. 입력관리 탭에서 해당 월 행을 추가해 주세요.`,
    }
  }

  return {
    sources: ["performance"],
    content: [
      `${month} 계획/실적 집계입니다.`,
      "",
      formatMetricBlock(month, metrics),
    ].join("\n"),
  }
}

function emptyMetrics(): MetricTotals {
  return {
    planPeople: 0,
    planCount: 0,
    planBudget: 0,
    actualPeople: 0,
    actualCount: 0,
    actualExpense: 0,
  }
}

function answerPerformanceSubProject(
  subProject: string,
  snapshot: AssistantDataSnapshot,
): AssistantAnswer {
  const metrics = snapshot.performance.bySubProject[subProject]
  if (!metrics) {
    return {
      sources: ["performance"],
      content: `「${subProject}」 세목 데이터를 찾지 못했습니다. 등록된 세목: ${snapshot.performance.subProjects.join(", ")}`,
    }
  }

  return {
    sources: ["performance"],
    content: [
      `세부사업명(세목) 「${subProject}」 기준 집계입니다.`,
      "",
      formatMetricBlock(subProject, metrics),
    ].join("\n"),
  }
}

function answerDashboard(snapshot: AssistantDataSnapshot): AssistantAnswer {
  const statLines = snapshot.dashboard.stats.map(
    (item) => `· ${item.label}: ${item.value}${item.unit} — ${item.description}`,
  )
  const progressLines = snapshot.dashboard.progress.map(
    (item) => `· ${item.label}: ${item.value}%`,
  )

  return {
    sources: ["dashboard", "aggregate"],
    content: [
      "대시보드 요약입니다.",
      "",
      "주요 지표:",
      ...statLines,
      "",
      "달성/집행률:",
      ...progressLines,
    ].join("\n"),
  }
}

function answerKanban(snapshot: AssistantDataSnapshot): AssistantAnswer {
  const statusLines = Object.entries(snapshot.kanban.tasksByStatus).map(
    ([status, count]) => `· ${status}: ${count}건`,
  )

  return {
    sources: ["kanban"],
    content: [
      "칸반 보드 데이터입니다.",
      "",
      `· 활성 프로젝트: ${snapshot.kanban.projectCount}개`,
      `· 전체 업무 카드: ${snapshot.kanban.taskCount}건`,
      "",
      "단계별:",
      ...statusLines,
    ].join("\n"),
  }
}

function answerOrganization(snapshot: AssistantDataSnapshot): AssistantAnswer {
  return {
    sources: ["organization"],
    content: [
      "조직/인사 데이터 요약입니다.",
      "",
      `· 부서 수: ${snapshot.organization.departmentCount}개`,
      `· 등록 직원: ${snapshot.organization.employeeCount}명`,
      "",
      "상세 명단은 「조직」 메뉴에서 확인할 수 있습니다.",
    ].join("\n"),
  }
}

function answerEbooks(snapshot: AssistantDataSnapshot): AssistantAnswer {
  return {
    sources: ["ebooks"],
    content: [
      "전자책/자료실 데이터입니다.",
      "",
      `· 등록 자료: ${snapshot.ebooks.bookCount}권`,
      `· 카테고리: ${snapshot.ebooks.categories.join(", ")}`,
    ].join("\n"),
  }
}

function answerSurveys(snapshot: AssistantDataSnapshot): AssistantAnswer {
  return {
    sources: ["survey"],
    content: [
      "설문 데이터입니다.",
      "",
      `· 설문 수: ${snapshot.surveys.totalCount}개`,
      snapshot.surveys.titles.length > 0
        ? `· 목록: ${snapshot.surveys.titles.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }
}

function answerFullAggregate(snapshot: AssistantDataSnapshot): AssistantAnswer {
  const parts = [
    answerPerformanceAggregate(snapshot).content,
    "",
    "---",
    "",
    answerDashboard(snapshot).content,
    "",
    "---",
    "",
    answerKanban(snapshot).content,
  ]

  return {
    sources: ["aggregate", "performance", "dashboard", "kanban"],
    content: parts.join("\n"),
  }
}

export function answerAssistantQuestion(
  question: string,
  snapshot: AssistantDataSnapshot,
): AssistantAnswer {
  const text = question.trim()
  if (!text) {
    return answerHelp()
  }

  if (/^(안녕|하이|hello|hi|도움|help)/i.test(text)) {
    return answerGreeting(snapshot)
  }

  const domains = matchDomain(text)
  const aggregate = isAggregateQuery(text)
  const month = parseMonth(text)
  const subProject = findSubProject(text, snapshot)

  if (
    aggregate &&
    !domains.kanban &&
    !domains.dashboard &&
    !domains.organization &&
    !domains.ebooks &&
    !domains.survey &&
    (domains.performance || /실적|계획|예산|사업/.test(text))
  ) {
    if (/전체|요약|집계|총괄|통합|모두|다/.test(text)) {
      return answerFullAggregate(snapshot)
    }
    return answerPerformanceAggregate(snapshot)
  }

  if (month && (domains.performance || aggregate || /실적|계획|예산/.test(text))) {
    return answerPerformanceMonth(month, snapshot)
  }

  if (subProject) {
    return answerPerformanceSubProject(subProject, snapshot)
  }

  if (domains.dashboard) return answerDashboard(snapshot)
  if (domains.kanban) return answerKanban(snapshot)
  if (domains.organization) return answerOrganization(snapshot)
  if (domains.ebooks) return answerEbooks(snapshot)
  if (domains.survey) return answerSurveys(snapshot)
  if (domains.performance) return answerPerformanceAggregate(snapshot)

  if (aggregate) return answerFullAggregate(snapshot)

  return {
    sources: ["help"],
    content: [
      "질문을 이해하지 못했습니다. 데이터 범위를 조금 더 구체적으로 적어 주세요.",
      "",
      "예: 「5월 실적 예산 합계」, 「온라인홍보 실적」, 「대시보드 요약」, 「칸반 업무 수」",
    ].join("\n"),
  }
}
