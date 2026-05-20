import { buildAssistantDataSnapshot } from "@/lib/chat/assistant-data"
import { answerAssistantQuestion } from "@/lib/chat/assistant-engine"
import {
  answerWithAssistantLlm,
  isAssistantLlmConfigured,
} from "@/lib/chat/assistant-llm"
import { answerFromKnowledgeGraph } from "@/lib/chat/ontology/answer-from-graph"
import { resolveOntologyForQuestion } from "@/lib/chat/ontology/resolve-ontology"
import type { AssistantQuestionResponse } from "@/services/chat.types"

function toResponsePayload(
  answer: string,
  sources: string[],
  dataAsOf: string,
  query: ReturnType<typeof resolveOntologyForQuestion>["query"],
): AssistantQuestionResponse {
  return {
    answer,
    sources,
    dataAsOf,
    reasoningPaths: query.reasoningPaths,
    subgraph: {
      nodes: query.subgraph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
      })),
      edges: query.subgraph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        predicate: e.predicate,
      })),
    },
  }
}

/** 서버 전용: 온톨로지 그래프 + LLM 우선, 실패 시 그래프/규칙 폴백 */
export async function resolveAssistantAnswer(
  message: string,
): Promise<AssistantQuestionResponse> {
  const snapshot = buildAssistantDataSnapshot()
  const { graph, query } = resolveOntologyForQuestion(message)

  if (isAssistantLlmConfigured()) {
    try {
      const llm = await answerWithAssistantLlm(message, snapshot, query)
      return toResponsePayload(
        llm.content,
        llm.sources,
        snapshot.generatedAt,
        query,
      )
    } catch (error) {
      console.error("[assistant-llm] AI 답변 실패, 그래프/규칙으로 폴백:", error)
    }
  }

  const graphAnswer = answerFromKnowledgeGraph(message, query, graph)
  if (
    graphAnswer.sources.includes("ontology") &&
    (query.subgraph.nodes.length > 3 || /그래프|온톨로지|구조|관계/.test(message))
  ) {
    return toResponsePayload(
      graphAnswer.content,
      graphAnswer.sources,
      snapshot.generatedAt,
      query,
    )
  }

  const rule = answerAssistantQuestion(message, snapshot)
  return toResponsePayload(
    rule.content,
    [...new Set([...rule.sources, "ontology"])],
    snapshot.generatedAt,
    query,
  )
}
