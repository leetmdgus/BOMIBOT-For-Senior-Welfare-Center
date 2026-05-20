import { PREDICATE_LABELS, DOMAIN_NODE_IDS } from "./vocabulary"
import type {
  GraphQueryResult,
  KnowledgeGraph,
  KnowledgeNode,
} from "./types"

const DOMAIN_KEYWORDS: Record<string, string> = {
  performance: "domain:performance",
  실적: "domain:performance",
  계획: "domain:performance",
  예산: "domain:performance",
  세목: "domain:performance",
  세세목: "domain:performance",
  입력관리: "domain:performance",
  dashboard: "domain:dashboard",
  대시보드: "domain:dashboard",
  달성률: "domain:dashboard",
  집행: "domain:dashboard",
  kanban: "domain:kanban",
  칸반: "domain:kanban",
  업무: "domain:kanban",
  태스크: "domain:kanban",
  organization: "domain:organization",
  조직: "domain:organization",
  직원: "domain:organization",
  부서: "domain:organization",
  ebooks: "domain:ebooks",
  전자책: "domain:ebooks",
  자료: "domain:ebooks",
  survey: "domain:survey",
  설문: "domain:survey",
  만족도: "domain:survey",
}

const MONTH_PATTERN = /(\d{1,2})\s*월/g

function normalize(text: string | undefined | null) {
  if (!text) return ""
  return text.toLowerCase().replace(/\s+/g, "")
}

function scoreNode(node: KnowledgeNode, question: string): number {
  const q = normalize(question)
  let score = 0

  const labelNorm = normalize(node.label)
  if (labelNorm && q.includes(labelNorm)) score += 10

  for (const alias of node.aliases ?? []) {
    const aliasNorm = normalize(alias)
    if (aliasNorm && q.includes(aliasNorm)) score += 6
  }

  if (node.type === "TimePeriod" && node.label) {
    if (q.includes(normalize(node.label))) score += 12
  }

  if (node.properties) {
    for (const value of Object.values(node.properties)) {
      if (typeof value === "string" && normalize(value).length > 2) {
        if (q.includes(normalize(value))) score += 4
      }
    }
  }

  return score
}

function expandSubgraph(
  graph: KnowledgeGraph,
  seedIds: string[],
  depth = 2,
): { nodes: KnowledgeNode[]; edges: typeof graph.edges } {
  const visited = new Set<string>(seedIds)
  const queue = seedIds.map((id) => ({ id, depth: 0 }))

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.depth >= depth) continue

    for (const e of graph.edges) {
      const next =
        e.source === current.id
          ? e.target
          : e.target === current.id
            ? e.source
            : null
      if (!next || visited.has(next)) continue
      visited.add(next)
      queue.push({ id: next, depth: current.depth + 1 })
    }
  }

  const nodes = graph.nodes.filter((n) => visited.has(n.id))
  const nodeSet = new Set(nodes.map((n) => n.id))
  const edges = graph.edges.filter(
    (e) => nodeSet.has(e.source) && nodeSet.has(e.target),
  )

  return { nodes, edges }
}

function buildReasoningPaths(
  graph: KnowledgeGraph,
  seedIds: string[],
): string[] {
  const paths: string[] = []
  const seen = new Set<string>()

  for (const seedId of seedIds.slice(0, 8)) {
    const seed = graph.nodes.find((n) => n.id === seedId)
    if (!seed) continue

    const outEdges = graph.edges.filter((e) => e.source === seedId)
    for (const e of outEdges.slice(0, 3)) {
      const target = graph.nodes.find((n) => n.id === e.target)
      if (!target) continue
      const pred = PREDICATE_LABELS[e.predicate] ?? e.predicate
      const line = `${seed.label} —[${pred}]→ ${target.label}`
      if (!seen.has(line)) {
        seen.add(line)
        paths.push(line)
      }
    }
  }

  return paths
}

function formatContext(
  graph: KnowledgeGraph,
  subgraph: GraphQueryResult["subgraph"],
  reasoningPaths: string[],
): string {
  const classLines = Object.entries(graph.classHierarchy)
    .filter(([, parent]) => parent === "Platform" || parent === "Domain")
    .map(([cls, parent]) => `  - ${cls} ⊂ ${parent ?? "—"}`)
    .slice(0, 12)

  const nodeLines = subgraph.nodes.map((n) => {
    const props = n.properties
      ? Object.entries(n.properties)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
      : ""
    return `  [${n.type}] ${n.label} (id=${n.id})${props ? ` {${props}}` : ""}`
  })

  const edgeLines = subgraph.edges.map((e) => {
    const src = graph.nodes.find((n) => n.id === e.source)?.label ?? e.source
    const tgt = graph.nodes.find((n) => n.id === e.target)?.label ?? e.target
    const pred = PREDICATE_LABELS[e.predicate] ?? e.predicate
    return `  (${src}) —${pred}→ (${tgt})`
  })

  return [
    "=== 온톨로지 지식 그래프 (TBox 일부) ===",
    ...classLines,
    "",
    `=== 질문 관련 서브그래프 (노드 ${subgraph.nodes.length}, 관계 ${subgraph.edges.length}) ===`,
    ...nodeLines.slice(0, 40),
    ...(nodeLines.length > 40 ? [`  … 외 ${nodeLines.length - 40}노드`] : []),
    "",
    "=== 관계 트리플 ===",
    ...edgeLines.slice(0, 35),
    ...(edgeLines.length > 35 ? [`  … 외 ${edgeLines.length - 35}관계`] : []),
    "",
    "=== 그래프 추론 경로 ===",
    ...(reasoningPaths.length > 0
      ? reasoningPaths.map((p) => `  · ${p}`)
      : ["  · (직접 연결 경로 없음)"]),
  ].join("\n")
}

export function queryKnowledgeGraph(
  question: string,
  graph: KnowledgeGraph,
): GraphQueryResult {
  const q = question.trim()
  const scored = graph.nodes
    .map((node) => ({ node, score: scoreNode(node, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const domainSeeds: string[] = []
  const normalizedQ = normalize(q)
  for (const [keyword, domainId] of Object.entries(DOMAIN_KEYWORDS)) {
    if (normalizedQ.includes(normalize(keyword))) {
      domainSeeds.push(domainId)
    }
  }

  const monthMatches = [...q.matchAll(MONTH_PATTERN)].map((m) => `${m[1]}월`)
  for (const month of monthMatches) {
    const monthNode = graph.nodes.find(
      (n) => n.type === "TimePeriod" && n.label === month,
    )
    if (monthNode) scored.push({ node: monthNode, score: 20 })
  }

  if (/전체|요약|통합|집계|총|모든/.test(q)) {
    domainSeeds.push(
      DOMAIN_NODE_IDS.performance,
      DOMAIN_NODE_IDS.dashboard,
      DOMAIN_NODE_IDS.kanban,
    )
  }

  const topIds = [
    ...new Set([
      ...domainSeeds,
      ...scored.slice(0, 12).map((s) => s.node.id),
    ]),
  ]

  if (topIds.length === 0) {
    topIds.push(
      DOMAIN_NODE_IDS.performance,
      DOMAIN_NODE_IDS.dashboard,
      "platform:bomibot",
    )
  }

  const depth = /전체|요약|통합|관계|그래프|연결/.test(q) ? 2 : 1
  const subgraph = expandSubgraph(graph, topIds, depth)
  const reasoningPaths = buildReasoningPaths(graph, topIds)

  return {
    matchedNodeIds: topIds,
    subgraph,
    reasoningPaths,
    contextText: formatContext(graph, subgraph, reasoningPaths),
  }
}
