/** 온톨로지 클래스(개념) */
export type OntologyClass =
  | "Platform"
  | "Domain"
  | "SubProject"
  | "DetailCategory"
  | "TimePeriod"
  | "PerformanceRecord"
  | "MetricBundle"
  | "KanbanProject"
  | "KanbanColumn"
  | "Task"
  | "Department"
  | "Employee"
  | "Ebook"
  | "Survey"
  | "DashboardIndicator"
  | "ProgressIndicator"

/** 관계(속성) — RDF 스타일 predicate */
export type OntologyPredicate =
  | "rdf:type"
  | "partOf"
  | "hasSubProject"
  | "hasDetailCategory"
  | "occursIn"
  | "hasMetric"
  | "aggregatesTo"
  | "belongsToProject"
  | "inColumn"
  | "assignedTo"
  | "memberOf"
  | "measures"
  | "relatedTo"
  | "hasTask"
  | "hasColumn"
  | "hasIndicator"
  | "hasProgress"
  | "hasEbook"
  | "hasSurvey"

export type KnowledgeNode = {
  id: string
  type: OntologyClass
  label: string
  /** 검색·매칭용 별칭 */
  aliases?: string[]
  properties?: Record<string, string | number | boolean>
}

export type KnowledgeEdge = {
  id: string
  source: string
  target: string
  predicate: OntologyPredicate
  label?: string
}

export type KnowledgeGraph = {
  version: string
  generatedAt: string
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  /** 클래스 계층: 자식 → 부모 */
  classHierarchy: Record<OntologyClass, OntologyClass | null>
}

export type GraphQueryResult = {
  matchedNodeIds: string[]
  subgraph: {
    nodes: KnowledgeNode[]
    edges: KnowledgeEdge[]
  }
  /** 추론 경로 (자연어) */
  reasoningPaths: string[]
  /** LLM·규칙 엔진용 컨텍스트 */
  contextText: string
}

export type OntologyGraphPayload = {
  graph: KnowledgeGraph
  stats: {
    nodeCount: number
    edgeCount: number
    domainCount: number
  }
}
