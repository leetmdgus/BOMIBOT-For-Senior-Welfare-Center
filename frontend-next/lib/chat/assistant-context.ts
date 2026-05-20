import type { AssistantDataSnapshot } from "./assistant-types"

/** LLM 시스템 프롬프트용 데이터 스냅샷 텍스트 */
export function formatAssistantDataContext(snapshot: AssistantDataSnapshot): string {
  const { performance, dashboard, kanban, organization, ebooks, surveys } =
    snapshot

  const monthLines = Object.entries(performance.byMonth)
    .filter(
      ([, m]) =>
        m.planBudget > 0 ||
        m.actualExpense > 0 ||
        m.planPeople > 0 ||
        m.actualPeople > 0,
    )
    .map(
      ([month, m]) =>
        `  ${month}: 계획 예산 ${m.planBudget.toLocaleString()}원 / 실적 지출 ${m.actualExpense.toLocaleString()}원 (인원 계획 ${m.planPeople}·실적 ${m.actualPeople})`,
    )

  const subProjectLines = performance.subProjects.map((name) => {
    const m = performance.bySubProject[name]
    if (!m) return null
    return `  ${name}: 계획 예산 ${m.planBudget.toLocaleString()}원 / 실적 ${m.actualExpense.toLocaleString()}원`
  })

  return [
    `데이터 기준 시각: ${snapshot.generatedAt}`,
    "",
    "## 대시보드",
    ...dashboard.stats.map(
      (s) => `- ${s.label}: ${s.value}${s.unit} (${s.description})`,
    ),
    ...dashboard.progress.map((p) => `- ${p.label}: ${p.value}%`),
    "",
    "## 계획/실적 입력 (행 ${performance.rowCount}건)",
    `- 전체 계획 예산: ${performance.totals.planBudget.toLocaleString()}원`,
    `- 전체 실적 지출: ${performance.totals.actualExpense.toLocaleString()}원`,
    `- 전체 계획 인원/횟수: ${performance.totals.planPeople}명 / ${performance.totals.planCount}회`,
    `- 전체 실적 인원/횟수: ${performance.totals.actualPeople}명 / ${performance.totals.actualCount}회`,
    "- 월별:",
    ...monthLines,
    "- 세목(세부사업명)별:",
    ...subProjectLines.filter(Boolean),
    "",
    "## 칸반",
    `- 프로젝트 ${kanban.projectCount}개, 업무 카드 ${kanban.taskCount}건`,
    ...Object.entries(kanban.tasksByStatus).map(
      ([status, count]) => `  - ${status}: ${count}건`,
    ),
    "",
    "## 조직",
    `- 부서 ${organization.departmentCount}개, 직원 ${organization.employeeCount}명`,
    "",
    "## 전자책",
    `- 자료 ${ebooks.bookCount}권, 카테고리: ${ebooks.categories.join(", ")}`,
    "",
    "## 설문",
    `- 설문 ${surveys.totalCount}개: ${surveys.titles.join(", ")}`,
  ].join("\n")
}
