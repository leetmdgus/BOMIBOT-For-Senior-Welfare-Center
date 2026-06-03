/**

 * region-store 스냅샷 → backend/seed/data + frontend-next/lib/mocks/seed-data

 * cd frontend-next && node scripts/export-region-seed-json.mjs

 */

import { writeFileSync, mkdirSync } from "fs"

import { join, dirname } from "path"

import { fileURLToPath } from "url"



const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const backendDir = join(root, "..", "backend", "seed", "data")



mkdirSync(backendDir, { recursive: true })



const { getRegionStore } = await import("../lib/mocks/region-store.ts")

const { getMonthlyPlanMock } = await import("../lib/mocks/kanban.monthly-plan.mock.ts")

const { getDefaultSurveyTemplate } = await import("../lib/mocks/survey.mock.ts")

const { chatAppConfigMock } = await import("../lib/mocks/chat.mock.ts")

const { buildKnowledgeGraph } = await import("../lib/chat/ontology/build-graph.ts")



function writeJson(dir, name, data) {

  mkdirSync(dir, { recursive: true })

  writeFileSync(join(dir, name), JSON.stringify(data, null, 2), "utf8")

  console.log("wrote", join(dir, name))

}



for (const regionId of ["chuncheon-north", "chuncheon-east"]) {

  const store = getRegionStore(regionId)

  const prefix = regionId === "chuncheon-north" ? "" : `${regionId}-`

  const frontendDir = join(root, "lib", "mocks", "seed-data", regionId)



  writeJson(backendDir, `${prefix}organization.json`, store.organization.departmentsData)

  writeJson(backendDir, `${prefix}dashboard.json`, {

    stats: store.dashboard.statsData,

    progress: store.dashboard.progressData,

    calendarEvents: store.dashboard.calendarEvents,

    volunteerEvents: store.dashboard.volunteerEvents,

  })

  writeJson(backendDir, `${prefix}kanban_projects.json`, store.kanban.projectsMock)



  writeJson(frontendDir, "bundle.json", store)



  writeJson(backendDir, `${prefix}ebooks.json`, store.ebooks)

  writeJson(backendDir, `${prefix}files.json`, {

    files: store.files.files,

    filesManager: store.filesManager,

  })

  writeJson(backendDir, `${prefix}survey.json`, {

    ...store.survey,

    defaultSurveyTemplate: getDefaultSurveyTemplate(),

  })

  writeJson(backendDir, `${prefix}version_history.json`, {

    entries: store.versionHistory.entries,

    restoredIds: [],

  })

  writeJson(backendDir, `${prefix}performance.json`, {

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

  writeJson(backendDir, `${prefix}task_detail.json`, {

    businessEvaluationData: store.taskDetail.businessEvaluationData,

    filesData: store.taskDetail.filesData,

    viewTogetherFixedFiles: store.taskDetail.viewTogetherFixedFiles,

    businessPlan: store.businessPlan,

    taskDetailSurveys: store.survey.surveyListItemsMock,

  })

  writeJson(backendDir, `${prefix}reports.json`, {

    performanceReportRows: store.documents.performanceReportRows,

    budgetReportRows: store.documents.budgetReportRows,

    businessPlanReportMock: store.documents.businessPlanReportMock,

  })

}



writeJson(backendDir, "chat.json", chatAppConfigMock)

writeJson(backendDir, "ontology.json", buildKnowledgeGraph())



console.log("done →", backendDir)

