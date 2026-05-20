import { getKnowledgeGraph } from "./build-graph"
import { queryKnowledgeGraph } from "./query-graph"
import type { GraphQueryResult, KnowledgeGraph } from "./types"

export function resolveOntologyForQuestion(message: string): {
  graph: KnowledgeGraph
  query: GraphQueryResult
} {
  const graph = getKnowledgeGraph()
  const query = queryKnowledgeGraph(message, graph)
  return { graph, query }
}
