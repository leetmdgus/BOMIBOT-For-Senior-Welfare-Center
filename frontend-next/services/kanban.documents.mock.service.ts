import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"
import { shouldBypassProjectAccess } from "@/lib/kanban/project-access"
import { getProjects } from "@/services/kanban.board.mock.service"
import type { DocumentsReportQuery } from "./kanban.documents.api.service"
import type {
  BusinessPlanReport,
  KanbanDocumentsResponse,
} from "./kanban.documents.types"

async function filterDocumentsForUser(
  store: Awaited<ReturnType<typeof loadRegionStore>>,
  regionId?: RegionId,
) {
  if (await shouldBypassProjectAccess()) {
    return store.documents
  }
  const year = String(new Date().getFullYear())
  const projects = await getProjects(year, regionId)
  const projectTitles = new Set(projects.map((project) => project.title))

  return {
    performanceReportRows: store.documents.performanceReportRows.filter((row) =>
      projectTitles.has(row.projectName),
    ),
    budgetReportRows: store.documents.budgetReportRows,
    businessPlanReportMock: {
      ...store.documents.businessPlanReportMock,
      items: (store.documents.businessPlanReportMock.items ?? []).filter(
        (item) => projectTitles.has(item.name),
      ),
    },
  }
}

export async function getKanbanDocuments(
  regionId?: RegionId,
): Promise<KanbanDocumentsResponse> {
  const store = await loadRegionStore({ regionId })
  const documents = await filterDocumentsForUser(store, regionId)

  return {
    performanceRows: documents.performanceReportRows,
    budgetRows: documents.budgetReportRows,
    businessPlan: documents.businessPlanReportMock,
  }
}

export async function getPerformanceReportRows(
  _filters?: DocumentsReportQuery,
  regionId?: RegionId,
) {
  const store = await loadRegionStore({ regionId })
  return store.documents.performanceReportRows
}

export async function getBudgetReportRows(regionId?: RegionId) {
  const store = await loadRegionStore({ regionId })
  return store.documents.budgetReportRows
}

export async function getBusinessPlanReport(
  regionId?: RegionId,
): Promise<BusinessPlanReport> {
  const store = await loadRegionStore({ regionId })
  return store.documents.businessPlanReportMock
}

export async function saveReports(
  _body: Record<string, unknown>,
  _type?: "performance" | "budget" | "business-plan",
) {
  return getKanbanDocuments()
}
