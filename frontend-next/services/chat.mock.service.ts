import { buildAssistantDataSnapshot } from "@/lib/chat/assistant-data"
import { answerAssistantQuestion } from "@/lib/chat/assistant-engine"
import { buildKnowledgeGraph } from "@/lib/chat/ontology/build-graph"
import { queryKnowledgeGraph } from "@/lib/chat/ontology/query-graph"
import { DOMAIN_NODE_IDS } from "@/lib/chat/ontology/vocabulary"
import { loadRegionStore } from "@/lib/auth/load-region-store"
import type { RegionId } from "@/lib/auth/regions"

import type {
  AssistantQuestionRequest,
  AssistantQuestionResponse,
  ChatAppConfig,
  CsTicketRequest,
  CsTicketResponse,
  OntologyGraphApiResponse,
} from "./chat.types"

/** UI mock: region-store + ????? ?? ?? (Next /api ???) */
export async function saveChatConfig(
  payload: Partial<ChatAppConfig>,
  regionId?: RegionId,
): Promise<ChatAppConfig> {
  const current = await getChatConfig(regionId)
  return { ...current, ...payload }
}

export async function getChatConfig(regionId?: RegionId): Promise<ChatAppConfig> {
  const store = await loadRegionStore({ regionId })
  return store.chat.chatAppConfigMock
}

export async function askAssistantQuestion(
  payload: AssistantQuestionRequest,
): Promise<AssistantQuestionResponse> {
  const message = payload.message?.trim()
  if (!message) {
    throw new Error("?? ??? ?????.")
  }

  const snapshot = buildAssistantDataSnapshot()
  const rule = answerAssistantQuestion(message, snapshot)

  return {
    answer: rule.content,
    sources: rule.sources,
    dataAsOf: snapshot.generatedAt,
    ragCitations: [],
  }
}

export async function submitCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  const ticketId = `CS-MOCK-${Date.now().toString(36).toUpperCase()}`
  return {
    ticketId,
    emailSent: false,
    sentTo: "",
    message: `?(mock) ??: ??? ???????. (${payload.subject ?? "??"})`,
  }
}

export async function getOntologyGraph(
  question?: string,
): Promise<OntologyGraphApiResponse> {
  const graph = buildKnowledgeGraph()
  const payload: OntologyGraphApiResponse = {
    graph,
    stats: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      domainCount: Object.keys(DOMAIN_NODE_IDS).length,
    },
  }

  const q = question?.trim()
  if (q) {
    payload.query = queryKnowledgeGraph(q, graph)
  }

  return payload
}
