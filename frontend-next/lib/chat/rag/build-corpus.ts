import { booksData } from "@/lib/mocks/ebooks.mock"
import { inputManagementRows } from "@/lib/mocks/kanban.performance-input.mock"
import { projectsMock } from "@/lib/mocks/kanban.board.mock"
import type { PerformanceRow } from "@/services/kanban.performance.types"

import type { AssistantDataSnapshot } from "../assistant-types"
import type { RagChunk } from "./types"

function chunk(
  id: string,
  source: RagChunk["source"],
  title: string,
  text: string,
): RagChunk {
  return { id, source, title, text }
}

function isCountableRow(row: PerformanceRow) {
  return Boolean(row.subProject) && row.subProject !== "선택"
}

export function buildRagCorpus(snapshot: AssistantDataSnapshot): RagChunk[] {
  const chunks: RagChunk[] = []
  const { dashboard, performance, kanban, organization, ebooks, surveys } =
    snapshot

  chunks.push(
    chunk(
      "dashboard:summary",
      "dashboard",
      "대시보드 요약",
      [
        "대시보드 지표:",
        ...dashboard.stats.map(
          (s) => `${s.label} ${s.value}${s.unit} — ${s.description}`,
        ),
        "진행률:",
        ...dashboard.progress.map((p) => `${p.label} ${p.value}%`),
      ].join("\n"),
    ),
  )

  for (const stat of dashboard.stats) {
    chunks.push(
      chunk(
        `dashboard:stat:${stat.label}`,
        "dashboard",
        `대시보드 · ${stat.label}`,
        `${stat.label}: ${stat.value}${stat.unit}. ${stat.description}`,
      ),
    )
  }

  chunks.push(
    chunk(
      "performance:totals",
      "performance",
      "계획/실적 전체 합계",
      [
        `입력 행 ${performance.rowCount}건`,
        `계획 예산 합계 ${performance.totals.planBudget.toLocaleString()}원`,
        `실적 지출 합계 ${performance.totals.actualExpense.toLocaleString()}원`,
        `계획 인원 ${performance.totals.planPeople}명, 횟수 ${performance.totals.planCount}회`,
        `실적 인원 ${performance.totals.actualPeople}명, 횟수 ${performance.totals.actualCount}회`,
      ].join("\n"),
    ),
  )

  for (const [month, totals] of Object.entries(performance.byMonth)) {
    if (
      totals.planBudget === 0 &&
      totals.actualExpense === 0 &&
      totals.planPeople === 0 &&
      totals.actualPeople === 0
    ) {
      continue
    }

    chunks.push(
      chunk(
        `performance:month:${month}`,
        "performance",
        `월별 실적 · ${month}`,
        `${month} 계획 예산 ${totals.planBudget.toLocaleString()}원, 실적 지출 ${totals.actualExpense.toLocaleString()}원. 계획 인원 ${totals.planPeople}명·횟수 ${totals.planCount}회, 실적 인원 ${totals.actualPeople}명·횟수 ${totals.actualCount}회.`,
      ),
    )
  }

  for (const name of performance.subProjects) {
    const totals = performance.bySubProject[name]
    if (!totals) continue

    chunks.push(
      chunk(
        `performance:sub:${name}`,
        "performance",
        `세목 · ${name}`,
        `${name} 세목: 계획 예산 ${totals.planBudget.toLocaleString()}원, 실적 지출 ${totals.actualExpense.toLocaleString()}원. 계획 인원 ${totals.planPeople}명, 실적 인원 ${totals.actualPeople}명.`,
      ),
    )
  }

  for (const row of inputManagementRows.filter(isCountableRow)) {
    chunks.push(
      chunk(
        `performance:row:${row.id}`,
        "performance",
        `${row.subProject} · ${row.detailCategory} · ${row.month}`,
        [
          `세부사업명(세목) ${row.subProject}, 상세분류(세세목) ${row.detailCategory}, ${row.month}`,
          `계획 인원 ${row.planPeople}명, 횟수 ${row.planCount}회, 예산 ${row.planBudget.toLocaleString()}원`,
          `실적 인원 ${row.actualPeople}명, 횟수 ${row.actualCount}회, 지출 ${row.actualExpense.toLocaleString()}원`,
          row.content ? `내용: ${row.content}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    )
  }

  chunks.push(
    chunk(
      "kanban:summary",
      "kanban",
      "칸반 보드 요약",
      [
        `프로젝트 ${kanban.projectCount}개, 업무 카드 ${kanban.taskCount}건`,
        ...Object.entries(kanban.tasksByStatus).map(
          ([status, count]) => `${status} ${count}건`,
        ),
      ].join("\n"),
    ),
  )

  for (const project of projectsMock) {
    for (const category of project.categories) {
      for (const task of category.tasks) {
        chunks.push(
          chunk(
            `kanban:task:${task.id ?? task.title}`,
            "kanban",
            `칸반 · ${project.title} · ${task.title}`,
            `프로젝트 ${project.title}, 컬럼 ${category.title}, 업무 ${task.title}. 담당 ${task.assignee || "미지정"}. ${task.description || ""}`.trim(),
          ),
        )
      }
    }
  }

  chunks.push(
    chunk(
      "organization:summary",
      "organization",
      "조직 현황",
      `부서 ${organization.departmentCount}개, 직원 ${organization.employeeCount}명.`,
    ),
  )

  chunks.push(
    chunk(
      "ebooks:summary",
      "ebooks",
      "전자책 자료",
      `전자책 ${ebooks.bookCount}권. 카테고리: ${ebooks.categories.join(", ")}.`,
    ),
  )

  for (const book of booksData) {
    chunks.push(
      chunk(
        `ebooks:book:${book.id}`,
        "ebooks",
        `전자책 · ${book.title}`,
        `${book.title} (${book.category}, ${book.team}).`,
      ),
    )
  }

  chunks.push(
    chunk(
      "survey:summary",
      "survey",
      "설문 목록",
      `설문 ${surveys.totalCount}개: ${surveys.titles.join(", ")}.`,
    ),
  )

  for (const title of surveys.titles) {
    chunks.push(
      chunk(
        `survey:title:${title}`,
        "survey",
        `설문 · ${title}`,
        `만족도·설문 과제: ${title}.`,
      ),
    )
  }

  return chunks
}
