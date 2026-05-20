/**
 * 서버 전용 챗봇 로직 (Route Handler · chat.server.service)
 * 클라이언트 facade(chat.service)와 분리 — LLM·SMTP·RAG 검색은 서버에서만 실행
 */
import { resolveAssistantAnswer } from "@/lib/chat/assistant-server"
import { processCsTicket } from "@/lib/chat/cs-ticket"
import { getKnowledgeGraph } from "@/lib/chat/ontology/build-graph"
import { queryKnowledgeGraph } from "@/lib/chat/ontology/query-graph"
import { DOMAIN_NODE_IDS } from "@/lib/chat/ontology/vocabulary"
import type { OntologyGraphPayload } from "@/lib/chat/ontology/types"
import { chatAppConfigMock } from "@/lib/mocks/chat.mock"

import type {
  AssistantQuestionResponse,
  ChatAppConfig,
  CsTicketRequest,
  CsTicketResponse,
} from "./chat.types"

export async function getChatAppConfig(): Promise<ChatAppConfig> {
  return structuredClone(chatAppConfigMock)
}

export async function askAssistantQuestionServer(
  message: string,
): Promise<AssistantQuestionResponse> {
  return resolveAssistantAnswer(message)
}

export async function submitCsTicketServer(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  return processCsTicket(payload)
}

export type OntologyGraphApiPayload = OntologyGraphPayload & {
  query?: ReturnType<typeof queryKnowledgeGraph>
}

export async function getOntologyGraphPayload(
  question?: string,
): Promise<OntologyGraphApiPayload> {
  const graph = getKnowledgeGraph()
  const domainCount = Object.keys(DOMAIN_NODE_IDS).length

  const payload: OntologyGraphApiPayload = {
    graph,
    stats: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      domainCount,
    },
  }

  const q = question?.trim()
  if (q) {
    payload.query = queryKnowledgeGraph(q, graph)
  }

  return payload
}

export { resolveAssistantAnswer, processCsTicket }
