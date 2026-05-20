import type { RagChunk } from "./types"
import { tokenizeForSearch } from "./tokenize"

function scoreChunk(queryTokens: string[], chunk: RagChunk): number {
  if (queryTokens.length === 0) return 0

  const haystack = `${chunk.title} ${chunk.text}`.toLowerCase()
  let score = 0

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += token.length >= 4 ? 3 : 2
    }
    if (chunk.title.toLowerCase().includes(token)) {
      score += 2
    }
  }

  return score
}

export function retrieveRagChunks(
  question: string,
  corpus: RagChunk[],
  topK = 8,
): RagChunk[] {
  const queryTokens = tokenizeForSearch(question)
  const minScore = queryTokens.length > 0 ? 2 : 0

  const ranked = corpus
    .map((chunk) => ({
      chunk,
      score: scoreChunk(queryTokens, chunk),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)

  const selected =
    ranked.length > 0
      ? ranked.slice(0, topK)
      : corpus.slice(0, Math.min(topK, corpus.length)).map((chunk) => ({
          chunk,
          score: 0,
        }))

  return selected.map(({ chunk, score }) => ({
    ...chunk,
    score,
  }))
}

export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) {
    return "=== RAG 검색 결과 ===\n(관련 문서를 찾지 못했습니다.)"
  }

  const body = chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] (${chunk.source}) ${chunk.title}\n${chunk.text}`,
    )
    .join("\n\n")

  return `=== RAG 검색 결과 (상위 ${chunks.length}건) ===\n${body}`
}
