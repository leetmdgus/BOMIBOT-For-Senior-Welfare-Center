export interface ChatSuggestion {
  id: string
  text: string
  icon: "barChart" | "fileText" | "search" | "clock" | "alert" | "help"
}

export type ChatPanelMode = "cs" | "assistant"

export interface AssistantConfig {
  welcomeMessage: string
  inputPlaceholder: string
  thinkingLabel: string
  suggestions: ChatSuggestion[]
}

export interface ChatConfig {
  welcomeMessage: string
  placeholderReply: string
  inputPlaceholder: string
  csEmail: string
  maxAttachments: number
  /** 문의 본문 최대 글자 수 */
  maxMessageLength: number
  /** 이미지 1개당 최대 용량(MB) */
  maxImageSizeMb: number
  /** 동영상 1개당 최대 용량(MB) */
  maxVideoSizeMb: number
  suggestions: ChatSuggestion[]
}

export interface ChatAppConfig {
  cs: ChatConfig
  assistant: AssistantConfig
}

export interface AssistantQuestionRequest {
  message: string
  pageUrl?: string
}

export interface AssistantSubgraphNode {
  id: string
  type: string
  label: string
}

export interface AssistantSubgraphEdge {
  source: string
  target: string
  predicate: string
}

export interface AssistantRagCitation {
  id: string
  source: string
  title: string
  snippet: string
  score?: number
}

export interface AssistantQuestionResponse {
  answer: string
  sources: string[]
  dataAsOf: string
  /** RAG 검색으로 찾은 근거 문서 */
  ragCitations?: AssistantRagCitation[]
  /** @deprecated 온톨로지 — RAG 전환 후 미사용 */
  subgraph?: {
    nodes: AssistantSubgraphNode[]
    edges: AssistantSubgraphEdge[]
  }
  /** @deprecated 온톨로지 — RAG 전환 후 미사용 */
  reasoningPaths?: string[]
}

export interface ChatAttachmentPayload {
  name: string
  type: string
  dataUrl: string
}

export interface CsTicketRequest {
  message: string
  attachments: ChatAttachmentPayload[]
  pageUrl?: string
  contactEmail?: string
}

export interface CsTicketResponse {
  ticketId: string
  emailSent: boolean
  sentTo: string
  message: string
}

export interface ChatMessageAttachment {
  id: string
  name: string
  previewUrl: string
  type: string
}

/** 온톨로지 API — lib/chat/ontology/types 와 동기화 */
export type {
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge,
  GraphQueryResult,
  OntologyGraphPayload,
} from "@/lib/chat/ontology/types"

import type { GraphQueryResult, OntologyGraphPayload } from "@/lib/chat/ontology/types"

export type OntologyGraphApiResponse = OntologyGraphPayload & {
  query?: GraphQueryResult
}
