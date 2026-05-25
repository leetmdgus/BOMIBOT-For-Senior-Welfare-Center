import { getRegionInfo, type RegionId } from "@/lib/auth/regions"
import {
  calendarEvents,
  progressData,
  statsData,
  volunteerEvents,
} from "@/lib/mocks/dashboard.mock"
import {
  booksData,
  categories,
  categoryStyles,
  suggestedQuestions,
} from "@/lib/mocks/ebooks.mock"
import { files } from "@/lib/mocks/files.mock"
import {
  defaultRecentIds,
  initialFiles,
  taskOptions,
} from "@/lib/mocks/files-manager.mock"
import {
  budgetReportRows,
  businessPlanReportMock,
  performanceReportRows,
} from "@/lib/mocks/kanban.documents.mock"
import {
  businessPlanAiDraftBody,
  defaultBusinessPlanDocument,
  defaultBusinessPlanFormData,
} from "@/lib/mocks/kanban.business-plan.mock"
import {
  budgetReports,
  businessPlanReports,
  categoryColumnTypeMapMock,
  defaultColumnTypeMock,
  performanceReports,
  projectImageOptions,
  projectsMock,
  staffMock,
  subProjects,
  taskPathMapMock,
} from "@/lib/mocks/kanban.board.mock"
import {
  defaultDetailCategories,
  inputManagementRows,
  performanceSubProjectChips,
} from "@/lib/mocks/kanban.performance-input.mock"
import { performanceSummarySeedRows } from "@/lib/mocks/kanban.performance-summary.mock"
import {
  businessEvaluationData,
  filesData,
  viewTogetherFixedFiles,
} from "@/lib/mocks/kanban.task-detail.mock"
import { versionHistoryMock } from "@/lib/mocks/kanban.version-history.mock"
import { monthlyPlanMonths } from "@/lib/mocks/kanban.monthly-plan.mock"
import { departmentsData } from "@/lib/mocks/organization.mock"
import {
  defaultSurveyStyle,
  surveyDetailsMock,
  surveyListItemsMock,
  surveyResultsMock,
} from "@/lib/mocks/survey.mock"
import {
  chatAppConfigMock,
  chatAssistantConfigMock,
  chatCsConfigMock,
} from "@/lib/mocks/chat.mock"

export interface RegionStore {
  regionId: RegionId
  orgName: string
  dashboard: {
    statsData: typeof statsData
    progressData: typeof progressData
    calendarEvents: typeof calendarEvents
    volunteerEvents: typeof volunteerEvents
  }
  organization: {
    departmentsData: typeof departmentsData
  }
  kanban: {
    projectsMock: typeof projectsMock
    staffMock: typeof staffMock
    projectImageOptions: typeof projectImageOptions
    subProjects: typeof subProjects
    performanceReports: typeof performanceReports
    budgetReports: typeof budgetReports
    businessPlanReports: typeof businessPlanReports
    taskPathMapMock: typeof taskPathMapMock
    categoryColumnTypeMapMock: typeof categoryColumnTypeMapMock
    defaultColumnTypeMock: typeof defaultColumnTypeMock
  }
  documents: {
    performanceReportRows: typeof performanceReportRows
    budgetReportRows: typeof budgetReportRows
    businessPlanReportMock: typeof businessPlanReportMock
  }
  versionHistory: {
    entries: typeof versionHistoryMock
  }
  files: {
    files: typeof files
  }
  filesManager: {
    taskOptions: typeof taskOptions
    initialFiles: typeof initialFiles
    defaultRecentIds: typeof defaultRecentIds
  }
  ebooks: {
    categories: typeof categories
    booksData: typeof booksData
    categoryStyles: typeof categoryStyles
    suggestedQuestions: typeof suggestedQuestions
  }
  performanceInput: {
    inputManagementRows: typeof inputManagementRows
    defaultDetailCategories: typeof defaultDetailCategories
    performanceSubProjectChips: typeof performanceSubProjectChips
  }
  performanceSummary: {
    performanceSummarySeedRows: typeof performanceSummarySeedRows
  }
  monthlyPlan: {
    monthlyPlanMonths: typeof monthlyPlanMonths
  }
  survey: {
    surveyListItemsMock: typeof surveyListItemsMock
    surveyDetailsMock: typeof surveyDetailsMock
    surveyResultsMock: typeof surveyResultsMock
    defaultSurveyStyle: typeof defaultSurveyStyle
  }
  taskDetail: {
    businessEvaluationData: typeof businessEvaluationData
    filesData: typeof filesData
    viewTogetherFixedFiles: typeof viewTogetherFixedFiles
  }
  businessPlan: {
    defaultBusinessPlanDocument: typeof defaultBusinessPlanDocument
    defaultBusinessPlanFormData: typeof defaultBusinessPlanFormData
    businessPlanAiDraftBody: typeof businessPlanAiDraftBody
  }
  chat: {
    chatCsConfigMock: typeof chatCsConfigMock
    chatAssistantConfigMock: typeof chatAssistantConfigMock
    chatAppConfigMock: typeof chatAppConfigMock
  }
}

const storeCache = new Map<RegionId, RegionStore>()

/** React 컴포넌트·함수·Symbol 등은 제외하고 복제 (structuredClone 호환) */
function clone<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nested) => {
      if (typeof nested === "function" || typeof nested === "symbol") {
        return undefined
      }
      return nested
    }),
  ) as T
}

function localizeOrgName(text: string, orgName: string, shortLabel: string): string {
  return text
    .replaceAll("춘천북부노인복지관", orgName)
    .replaceAll("춘천동부노인복지관", orgName)
    .replaceAll("복지관", orgName)
    .replaceAll("북부", shortLabel)
}

function buildRegionStore(regionId: RegionId): RegionStore {
  const { orgName, shortLabel } = getRegionInfo(regionId)

  const localizedStats = clone(statsData).map((stat) => ({
    ...stat,
    description: stat.description
      ? localizeOrgName(stat.description, orgName, shortLabel)
      : stat.description,
  }))

  if (regionId === "chuncheon-east") {
    localizedStats[0] = { ...localizedStats[0], value: "38", unit: "명" }
    localizedStats[1] = { ...localizedStats[1], value: "9", unit: "개" }
  }

  const localizedDepartments = clone(departmentsData).map((department) => ({
    ...department,
    employees: department.employees.map((employee) => ({
      ...employee,
      department: employee.department,
      email: employee.email.replace(
        "@welfare.org",
        regionId === "chuncheon-east" ? "@east.welfare.org" : "@north.welfare.org",
      ),
    })),
  }))

  const localizedProjects = clone(projectsMock).map((project) => ({
    ...project,
    title: localizeOrgName(project.title, orgName, shortLabel),
  }))

  const localizedBooks = clone(booksData).map((book) => ({
    ...book,
    title: localizeOrgName(book.title, orgName, shortLabel),
    team: book.team.includes("복지")
      ? book.team.replace("복지", shortLabel)
      : book.team,
  }))

  return {
    regionId,
    orgName,
    dashboard: {
      statsData: localizedStats,
      progressData: clone(progressData),
      calendarEvents: clone(calendarEvents),
      volunteerEvents: clone(volunteerEvents),
    },
    organization: {
      departmentsData: localizedDepartments,
    },
    kanban: {
      projectsMock: localizedProjects,
      staffMock: clone(staffMock),
      projectImageOptions: clone(projectImageOptions),
      subProjects: clone(subProjects),
      performanceReports: clone(performanceReports),
      budgetReports: clone(budgetReports),
      businessPlanReports: clone(businessPlanReports),
      taskPathMapMock: clone(taskPathMapMock),
      categoryColumnTypeMapMock: clone(categoryColumnTypeMapMock),
      defaultColumnTypeMock: clone(defaultColumnTypeMock),
    },
    documents: {
      performanceReportRows: clone(performanceReportRows),
      budgetReportRows: clone(budgetReportRows),
      businessPlanReportMock: clone(businessPlanReportMock),
    },
    versionHistory: {
      entries: clone(versionHistoryMock),
    },
    files: {
      files: clone(files),
    },
    filesManager: {
      taskOptions: clone(taskOptions),
      initialFiles: clone(initialFiles),
      defaultRecentIds: clone(defaultRecentIds),
    },
    ebooks: {
      categories: clone(categories),
      booksData: localizedBooks,
      categoryStyles: clone(categoryStyles),
      suggestedQuestions: clone(suggestedQuestions),
    },
    performanceInput: {
      inputManagementRows: clone(inputManagementRows),
      defaultDetailCategories: clone(defaultDetailCategories),
      performanceSubProjectChips: clone(performanceSubProjectChips),
    },
    performanceSummary: {
      performanceSummarySeedRows: clone(performanceSummarySeedRows),
    },
    monthlyPlan: {
      monthlyPlanMonths: clone(monthlyPlanMonths),
    },
    survey: {
      surveyListItemsMock: clone(surveyListItemsMock),
      surveyDetailsMock: clone(surveyDetailsMock),
      surveyResultsMock: clone(surveyResultsMock),
      defaultSurveyStyle: clone(defaultSurveyStyle),
    },
    taskDetail: {
      businessEvaluationData: clone(businessEvaluationData),
      filesData: clone(filesData),
      viewTogetherFixedFiles: clone(viewTogetherFixedFiles),
    },
    businessPlan: {
      defaultBusinessPlanDocument: clone(defaultBusinessPlanDocument),
      defaultBusinessPlanFormData: clone(defaultBusinessPlanFormData),
      businessPlanAiDraftBody: clone(businessPlanAiDraftBody),
    },
    chat: {
      chatCsConfigMock: clone(chatCsConfigMock),
      chatAssistantConfigMock: clone(chatAssistantConfigMock),
      chatAppConfigMock: clone(chatAppConfigMock),
    },
  }
}

export function getRegionStore(regionId: RegionId): RegionStore {
  const cached = storeCache.get(regionId)
  if (cached) return cached

  const store = buildRegionStore(regionId)
  storeCache.set(regionId, store)
  return store
}
