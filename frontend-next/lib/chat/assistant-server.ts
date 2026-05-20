import { buildAssistantDataSnapshot } from "@/lib/chat/assistant-data"
import { answerAssistantQuestion } from "@/lib/chat/assistant-engine"
import {
  answerWithRagLlm,
  isAssistantLlmConfigured,
} from "@/lib/chat/assistant-rag-llm"
import { resolveRagForQuestion } from "@/lib/chat/rag/resolve-rag"
import type { RagRetrieveResult } from "@/lib/chat/rag/types"
import type {
  AssistantQuestionResponse,
  AssistantRagCitation,
} from "@/services/chat.types"

function toCitations(rag: RagRetrieveResult): AssistantRagCitation[] {
  return rag.chunks.map((chunk) => ({
    id: chunk.id,
    source: chunk.source,
    title: chunk.title,
    snippet:
      chunk.text.length > 220 ? `${chunk.text.slice(0, 220)}…` : chunk.text,
    score: chunk.score,
  }))
}

function toResponsePayload(
  answer: string,
  sources: string[],
  dataAsOf: string,
  rag: RagRetrieveResult,
): AssistantQuestionResponse {
  return {
    answer,
    sources,
    dataAsOf,
    ragCitations: toCitations(rag),
  }
}

function sourcesFromRag(rag: RagRetrieveResult): string[] {
  return [...new Set(rag.chunks.map((chunk) => chunk.source))]
}

/** 서버 전용: RAG 검색 + LLM 우선, 실패 시 규칙 엔진 폴백 */
export async function resolveAssistantAnswer(
  message: string,
): Promise<AssistantQuestionResponse> {
  const snapshot = buildAssistantDataSnapshot()
  const rag = await resolveRagForQuestion(message, snapshot)

  if (isAssistantLlmConfigured()) {
    try {
      const llm = await answerWithRagLlm(message, snapshot, rag)
      return toResponsePayload(
        llm.content,
        llm.sources,
        snapshot.generatedAt,
        rag,
      )
    } catch (error) {
      console.error("[assistant-rag-llm] AI 답변 실패, 규칙 엔진으로 폴백:", error)
    }
  }

  const rule = answerAssistantQuestion(message, snapshot)
  return toResponsePayload(
    rule.content,
    [...new Set([...rule.sources, ...sourcesFromRag(rag), "rag"])],
    snapshot.generatedAt,
    rag,
  )
}
