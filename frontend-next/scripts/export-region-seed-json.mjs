/**
 * region-store 스냅샷 → backend/seed/data/*.json
 * cd frontend-next && node scripts/export-region-seed-json.mjs
 */
import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "..", "backend", "seed", "data")

mkdirSync(outDir, { recursive: true })

const { getRegionStore } = await import("../lib/mocks/region-store.ts")
const { getMonthlyPlanMock } = await import("../lib/mocks/kanban.monthly-plan.mock.ts")
const { getDefaultSurveyTemplate } = await import("../lib/mocks/survey.mock.ts")
const { chatAppConfigMock } = await import("../lib/mocks/chat.mock.ts")
const { buildKnowledgeGraph } = await import("../lib/chat/ontology/build-graph.ts")

function write(name, data) {
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2), "utf8")
  console.log("wrote", name)
}

for (const regionId of ["chuncheon-north", "chuncheon-east"]) {
  const store = getRegionStore(regionId)
  const prefix = regionId === "chuncheon-north" ? "" : `${regionId}-`
  write(`${prefix}ebooks.json`, store.ebooks)
  write(`${prefix}files.json`, {
    files: store.files.files,
    filesManager: store.filesManager,
  })
  write(`${prefix}survey.json`, {
    ...store.survey,
    defaultSurveyTemplate: getDefaultSurveyTemplate(),
  })
  write(`${prefix}version_history.json`, {
    entries: store.versionHistory.entries,
    restoredIds: [],
  })
  write(`${prefix}performance.json`, {
    inputManagementRows: store.performanceInput.inputManagementRows,
    defaultDetailCategories: store.performanceInput.defaultDetailCategories,
    performanceSubProjectChips: store.performanceInput.performanceSubProjectChips,
    performanceSummarySeedRows: store.performanceSummary.performanceSummarySeedRows,
    monthlyPlanMonths: store.monthlyPlan.monthlyPlanMonths,
    subProjects: store.kanban.subProjects,
    monthlyPlans: {
      기본계획: getMonthlyPlanMock("기본계획"),
      "1차추경": getMonthlyPlanMock("1차추경"),
      "2차추경": getMonthlyPlanMock("2차추경"),
    },
  })
  write(`${prefix}task_detail.json`, {
    businessEvaluationData: store.taskDetail.businessEvaluationData,
    filesData: store.taskDetail.filesData,
    viewTogetherFixedFiles: store.taskDetail.viewTogetherFixedFiles,
    businessPlan: store.businessPlan,
    taskDetailSurveys: store.survey.surveyListItemsMock,
  })
  write(`${prefix}reports.json`, {
    performanceReportRows: store.documents.performanceReportRows,
    budgetReportRows: store.documents.budgetReportRows,
    businessPlanReportMock: store.documents.businessPlanReportMock,
  })
}

write("chat.json", chatAppConfigMock)
write("ontology.json", buildKnowledgeGraph())

console.log("done →", outDir)
