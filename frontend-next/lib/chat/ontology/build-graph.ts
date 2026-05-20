import { statsData, progressData } from "@/lib/mocks/dashboard.mock"
import { booksData } from "@/lib/mocks/ebooks.mock"
import { inputManagementRows } from "@/lib/mocks/kanban.performance-input.mock"
import { projectsMock } from "@/lib/mocks/kanban.board.mock"
import { departmentsData } from "@/lib/mocks/organization.mock"
import { surveyListItemsMock } from "@/lib/mocks/survey.mock"
import type { PerformanceRow } from "@/services/kanban.performance.types"

import { ONTOLOGY_CLASSES } from "./vocabulary"
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  OntologyClass,
} from "./types"
import { DOMAIN_NODE_IDS } from "./vocabulary"

function slug(value: string) {
  return value.replace(/\s+/g, "_").replace(/[^\w가-힣_-]/g, "")
}

function node(
  id: string,
  type: OntologyClass,
  label: string,
  properties?: KnowledgeNode["properties"],
  aliases?: string[],
): KnowledgeNode {
  return { id, type, label, properties, aliases }
}

function edge(
  source: string,
  target: string,
  predicate: KnowledgeEdge["predicate"],
  label?: string,
): KnowledgeEdge {
  return {
    id: `e:${source}->${target}:${predicate}`,
    source,
    target,
    predicate,
    label,
  }
}

function isCountableRow(row: PerformanceRow) {
  return Boolean(row.subProject) && row.subProject !== "선택"
}

export function buildKnowledgeGraph(): KnowledgeGraph {
  const nodes: KnowledgeNode[] = []
  const edges: KnowledgeEdge[] = []

  const platformId = "platform:bomibot"
  nodes.push(
    node(platformId, "Platform", "봄이봇", {
      description: "사회복지 사업관리 플랫폼",
    }),
  )

  const domains: Array<{ id: string; label: string; key: string }> = [
    { id: DOMAIN_NODE_IDS.performance, label: "계획/실적", key: "performance" },
    { id: DOMAIN_NODE_IDS.dashboard, label: "대시보드", key: "dashboard" },
    { id: DOMAIN_NODE_IDS.kanban, label: "칸반", key: "kanban" },
    { id: DOMAIN_NODE_IDS.organization, label: "조직", key: "organization" },
    { id: DOMAIN_NODE_IDS.ebooks, label: "전자책", key: "ebooks" },
    { id: DOMAIN_NODE_IDS.survey, label: "설문", key: "survey" },
  ]

  for (const d of domains) {
    nodes.push(
      node(d.id, "Domain", d.label, { domainKey: d.key }, [
        d.label,
        d.key,
      ]),
    )
    edges.push(edge(d.id, platformId, "partOf"))
  }

  // Performance ontology
  const subProjectIds = new Map<string, string>()
  const monthIds = new Map<string, string>()

  for (const row of inputManagementRows.filter(isCountableRow)) {
    const subKey = slug(row.subProject)
    if (!subProjectIds.has(row.subProject)) {
      const sid = `subProject:${subKey}`
      subProjectIds.set(row.subProject, sid)
      nodes.push(
        node(sid, "SubProject", row.subProject, undefined, [row.subProject, "세목"]),
      )
      edges.push(
        edge(sid, DOMAIN_NODE_IDS.performance, "partOf"),
        edge(DOMAIN_NODE_IDS.performance, sid, "hasSubProject"),
      )
    }

    if (row.detailCategory && row.detailCategory !== "—") {
      const dcId = `detail:${subKey}:${slug(row.detailCategory)}`
      if (!nodes.find((n) => n.id === dcId)) {
        nodes.push(
          node(dcId, "DetailCategory", row.detailCategory, undefined, [
            "세세목",
            row.detailCategory,
          ]),
        )
        edges.push(
          edge(dcId, subProjectIds.get(row.subProject)!, "partOf"),
          edge(subProjectIds.get(row.subProject)!, dcId, "hasDetailCategory"),
        )
      }
    }

    if (!monthIds.has(row.month)) {
      const mid = `month:${row.month}`
      monthIds.set(row.month, mid)
      nodes.push(node(mid, "TimePeriod", row.month, { month: row.month }))
    }

    const recordId = `perf:${row.id}`
    nodes.push(
      node(recordId, "PerformanceRecord", `${row.subProject} · ${row.month}`, {
        planPeople: row.planPeople,
        planCount: row.planCount,
        planBudget: row.planBudget,
        actualPeople: row.actualPeople,
        actualCount: row.actualCount,
        actualExpense: row.actualExpense,
        detailCategory: row.detailCategory,
      }),
    )
    edges.push(
      edge(recordId, DOMAIN_NODE_IDS.performance, "partOf"),
      edge(recordId, subProjectIds.get(row.subProject)!, "partOf"),
      edge(recordId, monthIds.get(row.month)!, "occursIn"),
    )

    const metricId = `metric:${recordId}`
    nodes.push(
      node(metricId, "MetricBundle", "계획/실적 지표", {
        planBudget: row.planBudget,
        actualExpense: row.actualExpense,
      }),
    )
    edges.push(edge(recordId, metricId, "hasMetric"))
  }

  // Dashboard
  for (const stat of statsData) {
    const id = `indicator:${slug(stat.label)}`
    nodes.push(
      node(id, "DashboardIndicator", stat.label, {
        value: stat.value,
        unit: stat.unit,
        description: stat.description,
      }),
    )
    edges.push(edge(id, DOMAIN_NODE_IDS.dashboard, "partOf", stat.label))
  }
  for (const prog of progressData) {
    const id = `progress:${slug(prog.label)}`
    nodes.push(
      node(id, "ProgressIndicator", prog.label, { value: prog.value }),
    )
    edges.push(edge(id, DOMAIN_NODE_IDS.dashboard, "hasProgress"))
  }

  // Kanban
  for (const project of projectsMock) {
    const pid = `project:${project.id}`
    nodes.push(
      node(pid, "KanbanProject", project.title, {
        team: project.team,
        manager: project.manager,
        year: project.year,
      }),
    )
    edges.push(edge(pid, DOMAIN_NODE_IDS.kanban, "partOf"))

    for (const category of project.categories) {
      const cid = `column:${category.id}`
      nodes.push(node(cid, "KanbanColumn", category.title))
      edges.push(
        edge(cid, pid, "partOf"),
        edge(pid, cid, "hasColumn"),
      )

      for (const task of category.tasks) {
        const tid = `task:${task.id}`
        nodes.push(
          node(tid, "Task", task.title, {
            assignee: task.assignee,
            completedCount: task.completedCount ?? 0,
            totalCount: task.totalCount ?? 0,
          }),
        )
        edges.push(
          edge(tid, cid, "inColumn"),
          edge(cid, tid, "hasTask"),
          edge(tid, pid, "belongsToProject"),
        )
      }
    }
  }

  // Organization
  for (const dept of departmentsData.filter((d) => d.id !== "all")) {
    const did = `dept:${dept.id}`
    nodes.push(node(did, "Department", dept.name, { count: dept.count }))
    edges.push(edge(did, DOMAIN_NODE_IDS.organization, "partOf"))

    for (const emp of dept.employees) {
      const eid = `emp:${emp.id}`
      nodes.push(
        node(eid, "Employee", emp.name, {
          role: emp.role,
          position: emp.position,
        }),
      )
      edges.push(edge(eid, did, "memberOf"), edge(did, eid, "relatedTo"))
    }
  }

  // Ebooks
  for (const book of booksData) {
    const bid = `ebook:${book.id}`
    nodes.push(
      node(bid, "Ebook", book.title, {
        category: book.category,
        author: book.author,
      }),
    )
    edges.push(edge(bid, DOMAIN_NODE_IDS.ebooks, "partOf"))
  }

  // Surveys
  for (const survey of surveyListItemsMock) {
    const sid = `survey:${survey.id}`
    nodes.push(
      node(
        sid,
        "Survey",
        survey.title,
        {
          program: survey.program,
          status: survey.status,
          responseCount: survey.responseCount,
          totalTarget: survey.totalTarget,
        },
        [survey.title, "설문"],
      ),
    )
    edges.push(edge(sid, DOMAIN_NODE_IDS.survey, "partOf"))
  }

  const classHierarchy = Object.fromEntries(
    Object.entries(ONTOLOGY_CLASSES).map(([key, meta]) => [
      key,
      meta.parent,
    ]),
  ) as KnowledgeGraph["classHierarchy"]

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    classHierarchy,
  }
}

let cachedGraph: KnowledgeGraph | null = null

export function getKnowledgeGraph(): KnowledgeGraph {
  if (!cachedGraph) {
    cachedGraph = buildKnowledgeGraph()
  }
  return cachedGraph
}

/** 테스트·핫리로드 후 그래프 재빌드 */
export function resetKnowledgeGraphCache() {
  cachedGraph = null
}
