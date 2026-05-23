import type { BusinessEvaluationData } from "@/services/kanban.task-detail.types"

/** 함께보기·문서 패널용 미리보기 HTML (평가 데이터 기반 생성) */
export function getEvaluationDocumentPreviewHtml(
  fileId: string,
  evaluation: BusinessEvaluationData,
): string {
  const rows = (labels: string[], values: string[]) =>
    labels
      .map(
        (label, i) =>
          `<tr><th class="border border-gray-300 bg-gray-50 px-2 py-1 text-center text-xs">${label}</th><td class="border border-gray-300 px-2 py-1 text-xs">${values[i] ?? ""}</td></tr>`,
      )
      .join("")

  if (fileId === "fixed-template") {
    return `<div class="space-y-2"><p class="text-center text-sm font-semibold">사회복지사업 최종사업평가서 (기본틀)</p><table class="w-full border-collapse border border-gray-300">${rows(
      ["사업팀", "담당자", "평가일", "프로그램명"],
      [
        evaluation.team,
        evaluation.manager,
        evaluation.evaluationDate,
        evaluation.programName,
      ],
    )}</table></div>`
  }

  if (fileId === "fixed-plan") {
    return `<div class="space-y-2"><p class="text-center text-sm font-semibold">${evaluation.programName}</p><p class="text-xs text-gray-600">사업계획서 요약</p><p class="text-xs leading-relaxed"><strong>목적</strong><br/>${evaluation.purpose}</p><ul class="list-disc pl-4 text-xs">${evaluation.goals.map((g) => `<li>${g}</li>`).join("")}</ul><p class="text-xs"><strong>기간</strong> ${evaluation.period}</p></div>`
  }

  const previews: Record<string, string> = {
    "eval-1": `<p class="text-sm font-semibold">2025 세대통합 사업 평가서</p><p class="mt-2 text-xs leading-relaxed">사업 목표 대비 실적 달성도를 종합 평가하였으며, 상담·교육 프로그램의 참여율과 만족도가 계획 수준을 유지하였습니다.</p>`,
    "eval-2": `<p class="text-sm font-semibold">실적 내역서</p><table class="mt-2 w-full border-collapse border border-gray-300 text-xs"><tr><th class="border px-2 py-1">구분</th><th class="border px-2 py-1">계획</th><th class="border px-2 py-1">실적</th></tr><tr><td class="border px-2 py-1">인원/회</td><td class="border px-2 py-1">${evaluation.planCount}</td><td class="border px-2 py-1">${evaluation.actualCount}</td></tr><tr><td class="border px-2 py-1">예산/지출</td><td class="border px-2 py-1">${evaluation.planBudget}</td><td class="border px-2 py-1">${evaluation.actualExpense}</td></tr></table>`,
    "eval-3": `<p class="text-sm font-semibold">운영 지침서</p><ol class="mt-2 list-decimal pl-4 text-xs space-y-1"><li>상담 실시 절차 및 기록 방법</li><li>개인정보 보호 및 비밀 유지</li><li>프로그램 운영 일정 및 안전 관리</li></ol>`,
    "eval-4": `<p class="text-sm font-semibold">결과표</p><p class="mt-2 text-xs">성과지표: ${evaluation.performanceIndicator}</p><p class="text-xs">평가도구: ${evaluation.evaluationTool}</p>`,
    "eval-5": `<p class="text-sm font-semibold">사업계획서 (첨부)</p><p class="mt-2 text-xs leading-relaxed">${evaluation.purpose}</p>`,
  }

  return (
    previews[fileId] ??
    `<p class="text-sm text-muted-foreground">문서 미리보기를 준비 중입니다.</p>`
  )
}
