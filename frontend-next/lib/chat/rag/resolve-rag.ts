import type { AssistantDataSnapshot } from "../assistant-types"
import { buildRagCorpus } from "./build-corpus"
import { fetchExternalRag, isExternalRagConfigured } from "./external-client"
import { formatRagContext, retrieveRagChunks } from "./retrieve"
import type { RagRetrieveResult } from "./types"

function getTopK() {
  const parsed = Number(process.env.RAG_TOP_K ?? 8)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8
}

export async function resolveRagForQuestion(
  question: string,
  snapshot: AssistantDataSnapshot,
): Promise<RagRetrieveResult> {
  if (isExternalRagConfigured()) {
    try {
      const external = await fetchExternalRag(question)
      if (external && external.chunks.length > 0) {
        return external
      }
    } catch (error) {
      console.error("[rag] 외부 RAG API 실패, 로컬 검색으로 폴백:", error)
    }
  }

  const corpus = buildRagCorpus(snapshot)
  const chunks = retrieveRagChunks(question, corpus, getTopK())

  return {
    chunks,
    contextText: formatRagContext(chunks),
  }
}
