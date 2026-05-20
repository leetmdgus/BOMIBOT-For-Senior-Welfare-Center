import type { AssistantAnswerSource } from "../assistant-types"

export type RagChunk = {
  id: string
  source: AssistantAnswerSource | "rag"
  title: string
  text: string
  score?: number
}

export type RagRetrieveResult = {
  chunks: RagChunk[]
  contextText: string
}

export type ExternalRagChunkPayload = {
  id?: string
  source?: string
  title?: string
  text?: string
  content?: string
  snippet?: string
  score?: number
}
